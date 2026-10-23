import type { OnboardingKey, OnboardingSeen } from "./types/onboarding";

// Pure decision logic, kept free of framework imports so it can be unit
// tested directly (see onboarding-rules.test.ts) and reused on both the
// server (what to render) and the client.

export function isSeen(seen: OnboardingSeen, key: OnboardingKey, version: number): boolean {
  return (seen[key] ?? 0) >= version;
}

export type WelcomeMode = "auto" | "banner" | "none";

/**
 * Only an account with nothing in it yet is walked through the tour
 * automatically. Someone who already has projects (an existing user when
 * this shipped, or a new user who got data in before opening the
 * dashboard) gets a dismissible offer instead of having a modal forced on
 * them mid-task.
 */
export function decideWelcomeMode(input: {
  seen: OnboardingSeen;
  version: number;
  projectCount: number;
}): WelcomeMode {
  if (isSeen(input.seen, "welcome", input.version)) return "none";
  return input.projectCount === 0 ? "auto" : "banner";
}

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

/**
 * Derived from data the Overview page already fetches - no extra backend
 * call and no stored progress. "Created an API key" is deliberately not an
 * item: every dashboard login mints a key, so the key list can't tell an
 * SDK key from a session key.
 */
export function buildChecklist(input: {
  projectCount: number;
  trainingRunCount: number;
  workspaceSeen: boolean;
}): ChecklistItem[] {
  return [
    {
      id: "project",
      label: "Create a project",
      description: "A project groups the experiments for one line of research.",
      href: "/dashboard/projects/new",
      done: input.projectCount > 0,
    },
    {
      id: "training-run",
      label: "Log a training run from the SDK",
      description: "Create an API key, install the SDK, and record a run - it shows up here automatically.",
      href: "/dashboard/settings/api-keys",
      done: input.trainingRunCount > 0,
    },
    {
      id: "workspace",
      label: "Open an experiment workspace",
      description: "Lineage, metrics, parameters and reproduction for one experiment, in one place.",
      href: "/dashboard/projects",
      done: input.workspaceSeen,
    },
  ];
}

export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; complete: boolean } {
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length, complete: done === items.length };
}
