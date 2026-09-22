import "server-only";
import { toBackendApiError } from "./errors";

const SYNTHGRAPH_API_URL = process.env.SYNTHGRAPH_API_URL ?? "http://localhost:3000";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type BackendFetchOptions = {
  method?: Method;
  body?: unknown;
  /** Bearer credential: either the transient login JWT or a long-lived `sg_...` API key. */
  token?: string;
};

/**
 * The one place that knows how to talk to synthgraph-backend. Every
 * feature's `server/*-api.ts` wraps this instead of calling `fetch`
 * directly, so auth headers, error mapping, and no-store caching stay
 * consistent everywhere.
 */
export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${SYNTHGRAPH_API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Every call here is user-scoped (auth or api-key gated); never let
    // Next's fetch cache serve one user's response to another's render.
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
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
