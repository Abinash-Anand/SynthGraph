"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { clamp } from "@/lib/utils";

/**
 * A 0 → 1 ramp that runs once after mount. Used for the hero graph's
 * self-assembly. Reduced-motion visitors are handed the finished state
 * directly, and no animation frame is ever scheduled for them.
 */
export function useMountProgress(durationMs = 2000, delayMs = 200): number {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - delayMs;
      const t = clamp(elapsed / durationMs, 0, 1);
      // easeOutQuint — fast to structure, then settles.
      setProgress(1 - Math.pow(1 - t, 5));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, delayMs, reducedMotion]);

  return reducedMotion ? 1 : progress;
}
