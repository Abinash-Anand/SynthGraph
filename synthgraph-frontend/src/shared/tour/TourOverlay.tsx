"use client";

import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { TourStep } from "./tour-types";

const SPOT_PADDING = 8;
const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

type Measured = { el: Element; rect: DOMRect };

// The rect lives in state keyed by the element it measured, so a stale
// rect from the previous step can never be drawn against a new target, and
// every setState happens in a callback rather than the effect body.
function useTargetRect(el: Element | null): DOMRect | null {
  const [measured, setMeasured] = useState<Measured | null>(null);

  // Polled every frame rather than driven by ResizeObserver/scroll events:
  // the target can move without resizing (the mobile drawer sliding in is a
  // CSS transform), and no event fires for that. State only changes when the
  // rect actually does, so an idle target costs one getBoundingClientRect.
  useEffect(() => {
    if (!el) return;
    let frame = 0;
    const tick = () => {
      const next = el.getBoundingClientRect();
      setMeasured((current) => {
        const prev = current && current.el === el ? current.rect : null;
        const same =
          prev &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.height === next.height;
        return same ? current : { el, rect: next };
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [el]);

  return measured && measured.el === el ? measured.rect : null;
}

export function TourOverlay({
  steps,
  index,
  ready,
  targetEl,
  onNext,
  onPrev,
  onSkip,
  onCta,
}: {
  steps: TourStep[];
  index: number;
  ready: boolean;
  targetEl: Element | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onCta: () => void;
}) {
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const centered = !step.target;
  const reducedMotion = useReducedMotion();
  const rect = useTargetRect(targetEl);
  const [popoverEl, setPopoverEl] = useState<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const { floatingStyles } = useFloating({
    elements: { reference: targetEl, floating: popoverEl },
    placement: step.placement ?? "bottom",
    // top/left, not transform: Motion owns `transform` on the popover for
    // its enter animation and would overwrite the position.
    transform: false,
    // animationFrame: the target may be mid-slide (mobile drawer) when the
    // popover mounts, which the default observers don't report.
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, { animationFrame: true }),
    middleware: [offset(16), flip({ padding: 16 }), shift({ padding: 16 })],
  });

  useEffect(() => {
    if (ready) primaryRef.current?.focus({ preventScroll: true });
  }, [ready, index]);

  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
      else if (event.key === "ArrowRight") onNext();
      else if (event.key === "ArrowLeft") onPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext, onPrev, onSkip]);

  const transition = reducedMotion ? { duration: 0 } : SPRING;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Swallows clicks so the page underneath can't be driven mid-tour. */}
      <div className="absolute inset-0" aria-hidden onClick={(event) => event.stopPropagation()} />

      {centered ? (
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-research-bg/75"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        />
      ) : rect ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed rounded-xl border border-research-accent shadow-[0_0_0_9999px_rgba(9,9,11,0.72)]"
          initial={false}
          animate={{
            x: rect.left - SPOT_PADDING,
            y: rect.top - SPOT_PADDING,
            width: rect.width + SPOT_PADDING * 2,
            height: rect.height + SPOT_PADDING * 2,
          }}
          style={{ left: 0, top: 0 }}
          transition={transition}
        />
      ) : null}

      <div className={cn(centered ? "absolute inset-0 flex items-center justify-center p-4" : "contents")}>
        <AnimatePresence mode="wait" initial={false}>
          {ready ? (
            <motion.div
              key={step.id}
              ref={setPopoverEl}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
              style={centered ? undefined : floatingStyles}
              className={cn(
                "z-[81] rounded-xl border border-research-border bg-research-panel shadow-2xl",
                centered ? "relative w-full max-w-[440px]" : "w-[min(360px,calc(100vw-2rem))]",
              )}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="mono-label text-research-ink-muted">
                    Step {index + 1} of {steps.length}
                  </p>
                  <div className="flex gap-1.5" aria-hidden>
                    {steps.map((s, i) => (
                      <span
                        key={s.id}
                        className={cn(
                          "size-1.5 rounded-full transition-colors",
                          i === index ? "bg-research-accent" : "bg-research-border",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <h2 id={titleId} className="text-[16px] font-medium text-research-ink">
                  {step.title}
                </h2>
                <p id={bodyId} className="text-[13.5px] leading-[1.6] text-research-ink-muted">
                  {step.body}
                </p>
                {step.cta ? (
                  <Link
                    href={step.cta.href}
                    onClick={onCta}
                    className="self-start text-[13px] text-research-accent-hover underline underline-offset-2 hover:text-research-accent"
                  >
                    {step.cta.label} →
                  </Link>
                ) : null}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="text-[12.5px] text-research-ink-muted transition-colors hover:text-research-ink"
                  >
                    Skip tour
                  </button>
                  <div className="flex gap-2">
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={onPrev}
                        className="rounded-md border border-research-border px-3 py-1.5 text-[13px] text-research-ink-secondary transition-colors hover:border-research-accent-subtle hover:text-research-ink"
                      >
                        Back
                      </button>
                    ) : null}
                    <button
                      ref={primaryRef}
                      type="button"
                      onClick={onNext}
                      className="rounded-md bg-research-accent px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-research-accent-hover"
                    >
                      {isLast ? "Done" : index === 0 && centered ? "Start tour" : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
