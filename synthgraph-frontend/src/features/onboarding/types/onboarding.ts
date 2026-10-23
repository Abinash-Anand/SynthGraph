export const ONBOARDING_KEYS = ["welcome", "workspace", "checklist"] as const;

export type OnboardingKey = (typeof ONBOARDING_KEYS)[number];

/** key -> the highest content version the user has seen or dismissed. */
export type OnboardingSeen = Partial<Record<OnboardingKey, number>>;
