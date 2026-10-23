import type { OnboardingKey } from "../types/onboarding";

/**
 * Fire-and-forget: failing to record "seen" must never break the tour or
 * the page - worst case the user is offered it once more.
 */
export function postOnboardingSeen(key: OnboardingKey, version: number): void {
  void fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, version }),
  }).catch(() => {});
}
