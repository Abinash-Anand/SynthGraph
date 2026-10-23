"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useDashboardShell } from "@/shared/layout/dashboard-shell-context";
import { TourProvider } from "@/shared/tour/TourProvider";
import type { TourDefinition, TourRequirement } from "@/shared/tour/tour-types";
import { postOnboardingSeen } from "../lib/post-onboarding-seen";
import { WELCOME_TOUR } from "../tours/welcome-tour";
import { WORKSPACE_TOUR } from "../tours/workspace-tour";
import type { OnboardingKey } from "../types/onboarding";

const TOURS: TourDefinition[] = [WELCOME_TOUR, WORKSPACE_TOUR];

// Matches Tailwind's `xl` breakpoint, where DashboardShell stops using the
// off-canvas drawer and shows the sidebar inline.
const SIDEBAR_INLINE_QUERY = "(min-width: 1280px)";
const DRAWER_TRANSITION_MS = 280;

/**
 * The dashboard-specific wiring around the generic tour engine: which tours
 * exist, how to make the sidebar visible for a step that points at it, and
 * where "completed or skipped" gets recorded. Mounted inside the shell
 * context provider and above the shell itself, so the top bar and command
 * palette can start tours.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { openMobileMenu, closeMobileMenu } = useDashboardShell();

  const requirements = useMemo<Record<string, TourRequirement>>(
    () => ({
      sidebar: {
        ensure: async () => {
          if (window.matchMedia(SIDEBAR_INLINE_QUERY).matches) return;
          openMobileMenu();
          await new Promise((resolve) => setTimeout(resolve, DRAWER_TRANSITION_MS));
        },
        release: closeMobileMenu,
      },
    }),
    [openMobileMenu, closeMobileMenu],
  );

  const onFinish = useCallback((tour: TourDefinition) => {
    // Completed and skipped are both "don't show this again".
    postOnboardingSeen(tour.id as OnboardingKey, tour.version);
  }, []);

  return (
    <TourProvider tours={TOURS} requirements={requirements} onFinish={onFinish}>
      {children}
    </TourProvider>
  );
}
