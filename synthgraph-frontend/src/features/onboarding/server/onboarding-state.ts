import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { ONBOARDING_KEYS, type OnboardingKey, type OnboardingSeen } from "../types/onboarding";

export const ONBOARDING_COOKIE_NAME = "sg_onboarding";

const cookieSchema = z.object({
  userId: z.string().min(1),
  seen: z.record(z.string(), z.number().int().nonnegative()),
});

function pickKnownKeys(raw: Record<string, number>): OnboardingSeen {
  const seen: OnboardingSeen = {};
  for (const key of ONBOARDING_KEYS) {
    if (typeof raw[key] === "number") seen[key] = raw[key];
  }
  return seen;
}

/**
 * Server-readable on purpose (a plain cookie, not localStorage): the
 * dashboard decides during render whether a tour is due, so there's no
 * flash of the dashboard before an auto-started tour appears and no
 * hydration mismatch. Keyed by user id so a second account on the same
 * browser doesn't inherit the first one's "already seen" state.
 *
 * Per-browser, not per-account - a user on a fresh device sees the tour
 * once more. Swapping this module for a backend column later only changes
 * these two functions; callers never see where the state lives.
 */
export async function readOnboardingSeen(userId: string): Promise<OnboardingSeen> {
  const store = await cookies();
  const raw = store.get(ONBOARDING_COOKIE_NAME)?.value;
  if (!raw) return {};

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }

  const parsed = cookieSchema.safeParse(json);
  if (!parsed.success || parsed.data.userId !== userId) return {};
  return pickKnownKeys(parsed.data.seen);
}

export async function markOnboardingSeen(userId: string, key: OnboardingKey, version: number): Promise<void> {
  const current = await readOnboardingSeen(userId);
  const next: OnboardingSeen = { ...current, [key]: Math.max(current[key] ?? 0, version) };

  const store = await cookies();
  store.set(ONBOARDING_COOKIE_NAME, JSON.stringify({ userId, seen: next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
