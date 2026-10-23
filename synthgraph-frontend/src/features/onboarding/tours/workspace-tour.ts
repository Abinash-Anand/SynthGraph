import type { TourDefinition } from "@/shared/tour/tour-types";

// Runs the first time someone opens an experiment that actually has data -
// the welcome tour can't show this screen to a brand-new account, since
// generations and training runs only arrive through the SDK.
export const WORKSPACE_TOUR: TourDefinition = {
  id: "workspace",
  version: 1,
  steps: [
    {
      id: "tabs",
      target: "ws-tabs",
      placement: "bottom",
      title: "Six views of one experiment",
      body: "Overview, Runs, Lineage, Metrics, Parameters and Reproduction. The tab you're on lives in the URL, so any view is shareable as a link.",
    },
    {
      id: "lineage",
      target: "tab-lineage",
      placement: "bottom",
      title: "Trace the chain",
      body: "The lineage graph connects generations, dataset versions, training runs and evaluations. Click any node to highlight its path and open its details.",
    },
    {
      id: "metrics",
      target: "tab-metrics",
      placement: "bottom",
      title: "Metrics, grouped",
      body: "Metric keys are grouped into collapsible categories you can search, and the chart only draws the ones you select.",
    },
    {
      id: "compare",
      target: "ws-compare",
      placement: "bottom",
      title: "Compare runs or generations",
      body: "Pick two to ten and diff them side by side. Selecting a generation also offers Compare with parent, to diff it against the generation it was derived from.",
    },
    {
      id: "inspector",
      title: "Details open on the right",
      body: "Click any run, generation or evaluation and its full details open in the inspector rail - configuration, final metrics, health, drift and linked evaluations. On smaller screens it's the floating button at the bottom right.",
    },
  ],
};
