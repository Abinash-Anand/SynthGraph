"use client";

import { useEffect } from "react";
import { useTour } from "@/shared/tour/TourProvider";
import { WORKSPACE_TOUR } from "../tours/workspace-tour";

// Longer than the welcome tour's delay: the workspace mounts a tab bar,
// a header and a canvas that all need to be measurable first.
const AUTO_START_DELAY_MS = 1000;

/** Renders nothing; starts the workspace tour once, the first time the server says it's due. */
export function WorkspaceTourAutoStart({ due }: { due: boolean }) {
  const { startTour } = useTour();

  useEffect(() => {
    if (!due) return;
    const timer = setTimeout(() => startTour(WORKSPACE_TOUR.id), AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [due, startTour]);

  return null;
}
