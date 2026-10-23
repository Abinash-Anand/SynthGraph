/**
 * A step with no `target` is a centered card (welcome / wrap-up). A step
 * with one spotlights the element carrying `data-tour="<target>"` - by
 * stable id rather than a CSS selector, so restyling a component can't
 * silently break a tour.
 */
export type TourStep = {
  id: string;
  target?: string;
  title: string;
  body: string;
  /** Floating UI placement hint for the popover; flips automatically when there's no room. */
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * Something the host app must make true before this step can be shown
   * (for example "sidebar": open the off-canvas drawer below the xl
   * breakpoint). Resolved by the `requirements` the provider is given, so
   * this engine stays unaware of any particular layout.
   */
  requires?: string;
  /** Optional call to action, rendered as a link; following it ends the tour as completed. */
  cta?: { label: string; href: string };
};

export type TourDefinition = {
  id: string;
  /** Bump to re-offer a tour whose content changed materially. */
  version: number;
  steps: TourStep[];
  /** When set, the tour can be started on demand (top bar, command palette). */
  launchable?: { label: string };
};

export type TourOutcome = "completed" | "skipped";

export type TourRequirement = {
  ensure: () => Promise<void> | void;
  release: () => void;
};
