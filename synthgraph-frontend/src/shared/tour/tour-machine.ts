import type { TourStep } from "./tour-types";

export type TourState = { phase: "idle" } | { phase: "active"; index: number; count: number };

export type TourAction =
  | { type: "start"; count: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; index: number }
  | { type: "stop" };

export const IDLE: TourState = { phase: "idle" };

export function reduceTour(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "start":
      return action.count > 0 ? { phase: "active", index: 0, count: action.count } : IDLE;
    case "stop":
      return IDLE;
    case "next":
      if (state.phase !== "active") return state;
      return state.index >= state.count - 1 ? IDLE : { ...state, index: state.index + 1 };
    case "prev":
      if (state.phase !== "active") return state;
      return { ...state, index: Math.max(0, state.index - 1) };
    case "goto":
      if (state.phase !== "active") return state;
      return { ...state, index: Math.min(Math.max(0, action.index), state.count - 1) };
  }
}

export function isLastStep(state: TourState): boolean {
  return state.phase === "active" && state.index === state.count - 1;
}

/**
 * Drops steps whose target isn't on the page right now (a tab that isn't
 * rendered, a control hidden at this breakpoint) instead of showing a
 * spotlight around nothing. Steps without a target are always kept.
 */
export function resolveSteps(steps: TourStep[], targetExists: (target: string) => boolean): TourStep[] {
  return steps.filter((step) => !step.target || targetExists(step.target));
}
