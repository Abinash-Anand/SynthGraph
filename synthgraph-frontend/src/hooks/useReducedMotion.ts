"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * Tracks `prefers-reduced-motion`. Assumed false during SSR so markup is
 * stable, then corrected on hydration. Scenes read this to stop render loops
 * entirely rather than merely slowing them down.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
