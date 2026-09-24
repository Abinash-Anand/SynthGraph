"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Composes INSIDE the existing DashboardShell, not a replacement for it:
 * DashboardShell's sidebar+topbar already serves the spec's "Control Rail"
 * role (nav: projects, experiments, datasets, ~240px vs. the spec's
 * ~220px). This component owns the remaining CENTER CANVAS + INSPECTOR
 * RAIL split from docs/design.md and docs/frontendarchitecture.md,
 * rendered as a migrated page's own content inside DashboardShell's
 * <main> - per the Phase 4 plan's incremental-adoption rule, routes
 * migrate to this one at a time rather than a big-bang outer-shell swap.
 */
export function ResearchWorkspace({
  canvas,
  inspector,
  inspectorTitle = "Inspector",
}: {
  canvas: ReactNode;
  inspector: ReactNode | null;
  inspectorTitle?: string;
}) {
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const duration = reducedMotion ? 0 : 0.25;

  // Same pattern as MobileMenu.tsx: lock page scroll behind the overlay,
  // close on Escape, move focus into the panel per basic dialog practice.
  useEffect(() => {
    if (!mobileInspectorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileInspectorOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileInspectorOpen]);

  return (
    <div className="flex items-start gap-6 xl:gap-8">
      <div className="min-w-0 flex-1">{canvas}</div>

      {inspector ? (
        <>
          <aside
            aria-label={inspectorTitle}
            className="hidden w-[380px] shrink-0 xl:block"
          >
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-research-border bg-research-panel">
              {inspector}
            </div>
          </aside>

          <button
            type="button"
            onClick={() => setMobileInspectorOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-30 rounded-full border border-research-border",
              "bg-research-elevated px-4 py-2.5 text-[13px] font-medium text-research-ink shadow-lg",
              "transition-colors hover:border-research-accent-subtle xl:hidden",
            )}
          >
            {inspectorTitle}
          </button>

          <AnimatePresence>
            {mobileInspectorOpen ? (
              <motion.div
                key="inspector-backdrop"
                className="fixed inset-0 z-40 xl:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration * 0.7 }}
              >
                <button
                  type="button"
                  aria-label="Close inspector"
                  onClick={() => setMobileInspectorOpen(false)}
                  className="absolute inset-0 bg-research-bg/70"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={inspectorTitle}
                  className="absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col border-l border-research-border bg-research-panel"
                  initial={reducedMotion ? false : { x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 32 }
                  }
                >
                  <div className="flex items-center justify-between border-b border-research-border px-4 py-3">
                    <p className="mono-label text-research-ink-secondary">{inspectorTitle}</p>
                    <button
                      ref={closeButtonRef}
                      type="button"
                      onClick={() => setMobileInspectorOpen(false)}
                      aria-label="Close"
                      className="grid size-7 place-items-center rounded-md text-research-ink-muted hover:text-research-ink"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">{inspector}</div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
