import type { OnboardingKey } from "../types/onboarding";

/**
 * Fire-and-forget: failing to record "seen" must never break the tour or
 * the page - worst case the user is offered it once more.
 *
 * `keepalive` lets the request (and its Set-Cookie) complete even if the
 * user reloads or leaves the page the instant they finish the tour.
 */
export function postOnboardingSeen(key: OnboardingKey, version: number): void {
  void fetch("/api/onboarding", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, version }),
  }).catch(() => {});
}
