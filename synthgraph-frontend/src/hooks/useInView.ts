"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  /** Keep reporting true once seen. Used for one-shot reveals. */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

/**
 * Reports whether an element is in the viewport.
 *
 * Returns `[ref, inView, seen]`. `seen` latches on the first intersection and
 * never clears — scenes use it to mount once, while `inView` continues to drive
 * whether their render loop should be running.
 */
export function useInView<T extends HTMLElement>(
  options: Options = {},
): [RefObject<T | null>, boolean, boolean] {
  const { once = false, rootMargin = "0px", threshold = 0 } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      // Without observer support, reveal everything rather than hide content.
      const frame = requestAnimationFrame(() => {
        setInView(true);
        setSeen(true);
      });
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          setSeen(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView, seen];
}
