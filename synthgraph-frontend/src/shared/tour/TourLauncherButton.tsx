"use client";

import { useTour } from "./TourProvider";

/** Renders nothing unless a launchable tour is registered, so it's safe to drop into any chrome. */
export function TourLauncherButton() {
  const { launchableTours, startTour } = useTour();
  const tour = launchableTours[0];
  if (!tour) return null;

  return (
    <button
      type="button"
      onClick={() => startTour(tour.id)}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-research-border px-2.5 text-[12.5px] text-research-ink-secondary transition-colors hover:border-research-accent-subtle hover:text-research-ink"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.4 5.4a1.7 1.7 0 1 1 2.4 1.55c-.55.3-.8.6-.8 1.15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="7" cy="10" r=".75" fill="currentColor" />
      </svg>
      <span className="max-sm:sr-only">{tour.label}</span>
    </button>
  );
}
