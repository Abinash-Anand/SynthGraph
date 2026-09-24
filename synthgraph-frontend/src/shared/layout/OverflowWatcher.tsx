"use client";

import { useEffect } from "react";

/**
 * Dev-only canary for the min-w-0/overflow-x-hidden trap that caused the
 * page-level horizontal scroll fixed across the dashboard (see
 * DashboardShell.tsx's own comment on why <main> needs min-w-0). That fix
 * added overflow-x-hidden as a backstop, which stops the *symptom* (the
 * whole page scrolling) but can just as easily *mask* a future instance -
 * a new wide element without min-w-0 on its own container would get
 * silently clipped instead of visibly pushing the page wide. This watches
 * for that condition and warns loudly in development instead of leaving it
 * to be noticed by a screenshot later. It renders nothing and does nothing
 * outside development.
 */
export function OverflowWatcher() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let lastWarnedWidth = 0;
    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const check = () => {
      scheduled = null;
      const { scrollWidth, clientWidth } = document.documentElement;
      const overflow = scrollWidth - clientWidth;
      if (overflow > 0 && overflow !== lastWarnedWidth) {
        lastWarnedWidth = overflow;
        console.warn(
          `[OverflowWatcher] Page content is ${overflow}px wider than the viewport (dev-only check). ` +
            "Something is overflowing horizontally and is likely being silently clipped by <main>'s " +
            "overflow-x-hidden rather than causing a visible scrollbar - find the wide element and " +
            "give its own container min-w-0 (or flex-wrap, for a button/tab row).",
        );
      } else if (overflow <= 0) {
        lastWarnedWidth = 0;
      }
    };
    // Batches bursts of mutations (e.g. a whole tab's content swapping in)
    // into one check shortly after instead of one per mutation record.
    // setTimeout, not requestAnimationFrame - rAF is suspended on a
    // backgrounded/hidden tab, which would silently stop this working
    // exactly when a user isn't looking at the tab, the opposite of what
    // a diagnostic like this should do.
    const scheduleCheck = () => {
      if (scheduled) return;
      scheduled = setTimeout(check, 100);
    };

    // ResizeObserver on documentElement only fires when the element's own
    // box changes (a real viewport/window resize) - it does NOT fire just
    // because a descendant's content makes scrollWidth grow, since
    // overflow-x-hidden means that growth never resizes documentElement's
    // own box. A MutationObserver on the whole body catches the actual
    // case this exists for: a re-render inserts or grows a wide element
    // without a window resize happening at all.
    const resizeObserver = new ResizeObserver(scheduleCheck);
    resizeObserver.observe(document.documentElement);
    const mutationObserver = new MutationObserver(scheduleCheck);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    check();

    return () => {
      if (scheduled) clearTimeout(scheduled);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
