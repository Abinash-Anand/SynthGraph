import "server-only";
import { backendFetch } from "@/shared/http/http";
import type { User } from "../types/user";

export type RegisterInput = { email: string; password: string };
export type LoginInput = { email: string; password: string };
export type LoginResult = { user: User; accessToken: string };

export function registerUser(input: RegisterInput): Promise<{ user: User }> {
  return backendFetch("/auth/register", { method: "POST", body: input });
}

export function loginUser(input: LoginInput): Promise<LoginResult> {
  return backendFetch("/auth/login", { method: "POST", body: input });
}

/**
 * `GET /auth/me/api-key` — the ApiKeyGuard-gated identity check, used as
 * the authoritative "is this session still valid" call (see server/session.ts).
 */
export function getMeByApiKey(apiKey: string): Promise<User> {
  return backendFetch("/auth/me/api-key", { token: apiKey });
}
