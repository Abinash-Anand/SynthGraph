"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IDLE, isLastStep, reduceTour, resolveSteps } from "./tour-machine";
import type { TourDefinition, TourOutcome, TourRequirement, TourStep } from "./tour-types";

// The spotlight/popover pull in Floating UI and Motion; a tour only runs a
// few times per account, so the overlay is loaded the moment one starts
// instead of riding along in every dashboard page's bundle (same reasoning
// as ECharts and xyflow).
const TourOverlay = dynamic(() => import("./TourOverlay").then((m) => m.TourOverlay), { ssr: false });

type TourContextValue = {
  activeTourId: string | null;
  startTour: (tourId: string) => void;
  launchableTours: Array<{ id: string; label: string }>;
};

const TourContext = createContext<TourContextValue>({
  activeTourId: null,
  startTour: () => {},
  launchableTours: [],
});

export function useTour(): TourContextValue {
  return useContext(TourContext);
}

type Presented = { index: number; targetEl: Element | null };

export function TourProvider({
  tours,
  requirements,
  onFinish,
  children,
}: {
  tours: TourDefinition[];
  requirements?: Record<string, TourRequirement>;
  onFinish?: (tour: TourDefinition, outcome: TourOutcome) => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reduceTour, IDLE);
  const [active, setActive] = useState<{ tour: TourDefinition; steps: TourStep[] } | null>(null);
  const [presented, setPresented] = useState<Presented | null>(null);
  const heldRequirement = useRef<string | null>(null);

  const releaseRequirement = useCallback(() => {
    if (heldRequirement.current) {
      requirements?.[heldRequirement.current]?.release();
      heldRequirement.current = null;
    }
  }, [requirements]);

  const startTour = useCallback(
    (tourId: string) => {
      const tour = tours.find((candidate) => candidate.id === tourId);
      if (!tour) return;
      const steps = resolveSteps(tour.steps, (target) => document.querySelector(`[data-tour="${target}"]`) !== null);
      if (steps.length === 0) return;
      setPresented(null);
      setActive({ tour, steps });
      dispatch({ type: "start", count: steps.length });
    },
    [tours],
  );

  const finish = useCallback(
    (outcome: TourOutcome) => {
      if (active) onFinish?.(active.tour, outcome);
      releaseRequirement();
      setPresented(null);
      setActive(null);
      dispatch({ type: "stop" });
    },
    [active, onFinish, releaseRequirement],
  );

  const next = useCallback(() => {
    if (isLastStep(state)) finish("completed");
    else dispatch({ type: "next" });
  }, [state, finish]);

  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const skip = useCallback(() => finish("skipped"), [finish]);

  // Always async (awaits before touching state), so entering a step never
  // sets state synchronously inside the effect body.
  useEffect(() => {
    if (state.phase !== "active" || !active) return;
    let cancelled = false;
    const step = active.steps[state.index];

    (async () => {
      const needed = step.requires ?? null;
      if (heldRequirement.current !== needed) {
        releaseRequirement();
        if (needed) {
          // Held before the await so a skip mid-ensure still releases it.
          heldRequirement.current = needed;
          await requirements?.[needed]?.ensure();
        }
      } else {
        await Promise.resolve();
      }
      if (cancelled) return;
      const targetEl = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      targetEl?.scrollIntoView({ block: "center", inline: "nearest" });
      setPresented({ index: state.index, targetEl });
    })();

    return () => {
      cancelled = true;
    };
  }, [state, active, requirements, releaseRequirement]);

  const value = useMemo<TourContextValue>(
    () => ({
      activeTourId: active?.tour.id ?? null,
      startTour,
      launchableTours: tours.filter((t) => t.launchable).map((t) => ({ id: t.id, label: t.launchable!.label })),
    }),
    [active, startTour, tours],
  );

  const ready = state.phase === "active" && presented?.index === state.index;

  return (
    <TourContext.Provider value={value}>
      {children}
      {state.phase === "active" && active ? (
        <TourOverlay
          steps={active.steps}
          index={state.index}
          ready={ready}
          targetEl={ready ? presented!.targetEl : null}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
          onCta={() => finish("completed")}
        />
      ) : null}
    </TourContext.Provider>
  );
}
