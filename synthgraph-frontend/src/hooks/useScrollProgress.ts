"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { clamp } from "@/lib/utils";

/**
 * Progress of an element through the viewport, 0 → 1.
 * 0 when the element's top reaches the bottom of the viewport,
 * 1 when its bottom reaches the top. Driven by rAF-throttled scroll so it
 * never fights the browser's own scrolling.
 */
export function useScrollProgress<T extends HTMLElement>(): [
  RefObject<T | null>,
  number,
] {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const total = rect.height + viewport;
      const travelled = viewport - rect.top;
      setProgress(clamp(travelled / total, 0, 1));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return [ref, progress];
}
