import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { ApiKeyCreated, ApiKeySummary } from "../types/api-key";

/**
 * All three routes are gated by JwtGuard on the backend, which — unlike
 * ApiKeyGuard — accepts EITHER a login JWT or an `sg_...` API key as the
 * bearer credential. That's what lets the dashboard use the session's own
 * long-lived API key here after login, instead of having to keep the
 * short-lived JWT around: the very first `createApiKey` call (at login,
 * minting the session key itself) is the only one that must pass the JWT,
 * since no API key exists yet at that point.
 */

export function createApiKey(bearerToken: string): Promise<ApiKeyCreated> {
  return backendFetch("/api-keys", { method: "POST", token: bearerToken });
}

export function listApiKeys(bearerToken: string): Promise<ApiKeySummary[]> {
  return backendFetch("/api-keys", { token: bearerToken });
}

export async function revokeApiKey(bearerToken: string, apiKeyId: string): Promise<void> {
  await backendFetch<void>(`/api-keys/${apiKeyId}`, { method: "DELETE", token: bearerToken });
}
