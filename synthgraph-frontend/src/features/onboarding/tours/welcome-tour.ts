import type { TourDefinition } from "@/shared/tour/tour-types";

// Steps whose target isn't on the current page (the Overview stat cards,
// when the tour is restarted from another page) are skipped automatically,
// so the same tour works from anywhere in the dashboard.
export const WELCOME_TOUR: TourDefinition = {
  id: "welcome",
  version: 1,
  launchable: { label: "Take the tour" },
  steps: [
    {
      id: "welcome",
      title: "Welcome to SynthGraph",
      body: "SynthGraph is a data lineage system for synthetic training data. It remembers how your generator, datasets, training runs and evaluations connect, so when a model misbehaves you can trace it back to the exact run that produced its data. This takes about a minute.",
    },
    {
      id: "projects",
      target: "nav-projects",
      requires: "sidebar",
      placement: "right",
      title: "Projects hold your work",
      body: "Everything nests: project, then experiment, then the generations and training runs inside it. Open an experiment to get its workspace - lineage, metrics, parameters and reproduction in one place.",
    },
    {
      id: "datasets",
      target: "nav-datasets",
      requires: "sidebar",
      placement: "right",
      title: "Datasets and assets",
      body: "Versioned catalogs of what your pipelines produce and consume. SynthGraph stores each version's URI and checksum, never the files themselves - your data stays wherever it already lives.",
    },
    {
      id: "reports",
      target: "nav-reports",
      requires: "sidebar",
      placement: "right",
      title: "Reports across every run",
      body: "Capture completeness, best runs, an efficiency leaderboard, and a search that finds training runs by any parameter or metric threshold.",
    },
    {
      id: "compare",
      target: "nav-compare",
      requires: "sidebar",
      placement: "right",
      title: "Compare side by side",
      body: "Diff generations or training runs and see exactly which parameters changed between the run that worked and the one that didn't.",
    },
    {
      id: "palette",
      target: "palette",
      placement: "bottom",
      title: "Search from anywhere",
      body: "Press Ctrl K (Cmd K on Mac) to jump to any project, experiment, generation or run - or to run a command, like restarting this tour.",
    },
    {
      id: "stats",
      target: "overview-stats",
      placement: "bottom",
      title: "Your numbers fill in here",
      body: "Projects, training runs and capture completeness update as data arrives. Want to see a populated example first?",
      cta: { label: "See an interactive example", href: "/demo" },
    },
    {
      id: "api-keys",
      target: "nav-api-keys",
      requires: "sidebar",
      placement: "right",
      title: "Connect your code",
      body: "Data arrives through the Python SDK or CLI. Create an API key here, then log your first generation or training run from your own scripts.",
      cta: { label: "Open API keys", href: "/dashboard/settings/api-keys" },
    },
  ],
};
