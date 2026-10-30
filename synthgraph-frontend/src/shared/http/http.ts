import "server-only";
import { toBackendApiError } from "./errors";

const SYNTHGRAPH_API_URL = process.env.SYNTHGRAPH_API_URL ?? "http://localhost:3000";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** How long one backend call took, as the caller saw it (retries included). */
export type BackendCallTiming = {
  method: Method;
  path: string;
  status: number;
  ms: number;
  /** Rate-limit retries before the answer. */
  retries: number;
  /** The backend's own `Server-Timing` breakdown, when it sends one. */
  serverTiming: string | null;
};

type BackendFetchOptions = {
  method?: Method;
  body?: unknown;
  /** Bearer credential: either the transient login JWT or a long-lived `sg_...` API key. */
  token?: string;
  /** Called once with how the call went, whether it succeeded or not. */
  onTiming?: (timing: BackendCallTiming) => void;
};

// Opt-in: set BACKEND_FETCH_TIMING=1 to log every backend call's duration.
// Paths carry resource ids but never the bearer token or any request body.
const LOG_EVERY_CALL = process.env.BACKEND_FETCH_TIMING === "1";

// A burst of parallel reads (a workspace page makes dozens) can trip the
// backend's rate limit by a few requests. Waiting out a short `Retry-After`
// turns that into a slightly slower page instead of a missing section; a long
// one means the caller is genuinely over budget, so it is surfaced, not slept on.
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 2_000;

function retryDelayMs(response: Response, attempt: number): number | null {
  const header = Number(response.headers.get("retry-after"));
  const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : 250 * 2 ** attempt;
  return waitMs <= MAX_RETRY_WAIT_MS ? waitMs : null;
}

/**
 * The one place that knows how to talk to synthgraph-backend. Every
 * feature's `server/*-api.ts` wraps this instead of calling `fetch`
 * directly, so auth headers, error mapping, and no-store caching stay
 * consistent everywhere.
 */
export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const { method = "GET", body, token, onTiming } = options;
  const startedAt = performance.now();

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const send = () =>
    fetch(`${SYNTHGRAPH_API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Every call here is user-scoped (auth or api-key gated); never let
      // Next's fetch cache serve one user's response to another's render.
      cache: "no-store",
    });

  let response = await send();
  let retries = 0;
  // Reads only: a rejected request was never executed, but replaying a write
  // is not something to do on the caller's behalf.
  while (method === "GET" && response.status === 429 && retries < MAX_RATE_LIMIT_RETRIES) {
    const waitMs = retryDelayMs(response, retries);
    if (waitMs === null) break;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    response = await send();
    retries += 1;
  }

  const raw = response.status === 204 ? "" : await response.text();

  if (onTiming || LOG_EVERY_CALL) {
    const timing: BackendCallTiming = {
      method,
      path,
      status: response.status,
      ms: Math.round(performance.now() - startedAt),
      retries,
      serverTiming: response.headers.get("server-timing"),
    };
    onTiming?.(timing);
    if (LOG_EVERY_CALL) console.info("backend_fetch", timing);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = raw ? parseJson(raw) : undefined;

  if (!response.ok) {
    throw toBackendApiError(response.status, extractMessage(data, response.status, path), data);
  }

  return data as T;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractMessage(data: unknown, status: number, path: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((entry) => typeof entry === "string")) {
      return message.join(", ");
    }
  }
  return `Request to ${path} failed with status ${status}`;
}
