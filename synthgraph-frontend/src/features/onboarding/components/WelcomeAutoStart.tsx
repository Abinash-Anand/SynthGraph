"use client";

import { useEffect, useState } from "react";
import { useTour } from "@/shared/tour/TourProvider";
import { postOnboardingSeen } from "../lib/post-onboarding-seen";
import type { WelcomeMode } from "../onboarding-rules";
import { WELCOME_TOUR } from "../tours/welcome-tour";

// Let the dashboard paint and settle first - a tour that opens in the same
// frame as the page feels like a popup ad rather than a guide.
const AUTO_START_DELAY_MS = 700;

export function WelcomeAutoStart({ mode }: { mode: Exclude<WelcomeMode, "none"> }) {
  const { startTour } = useTour();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (mode !== "auto") return;
    const timer = setTimeout(() => startTour(WELCOME_TOUR.id), AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mode, startTour]);

  if (mode !== "banner" || bannerDismissed) return null;

  return (
    <div
      role="region"
      aria-label="Product tour"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-research-accent-subtle bg-research-accent-subtle/10 px-4 py-3"
    >
      <p className="text-[13.5px] text-research-ink">
        New: a one-minute tour of where everything lives in SynthGraph.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setBannerDismissed(true);
            startTour(WELCOME_TOUR.id);
          }}
          className="rounded-md bg-research-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover"
        >
          Take the tour
        </button>
        <button
          type="button"
          onClick={() => {
            setBannerDismissed(true);
            postOnboardingSeen("welcome", WELCOME_TOUR.version);
          }}
          className="rounded-md px-3 py-1.5 text-[13px] text-research-ink-muted transition-colors hover:text-research-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
