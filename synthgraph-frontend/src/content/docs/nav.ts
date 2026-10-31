// The structure of the documentation site: one source for the sidebar, the
// previous and next links, the search index, the sitemap and the checks that
// every page has a file. A page appears here only when its .mdx file exists,
// and nav.test.ts fails if the two drift apart.
//
// Plain TypeScript with no path aliases, so node --test can run it.

export type DocPage = {
  /** Path under src/content/docs without the extension. "index" is /docs itself. */
  slug: string;
  title: string;
  /** One sentence, used as the page description and in search. */
  description: string;
};

export type DocSection = {
  title: string;
  pages: DocPage[];
};

export const DOCS_NAV: DocSection[] = [
  {
    title: "Get started",
    pages: [
      {
        slug: "index",
        title: "Introduction",
        description: "What SynthGraph is, what it records, and what it does not do.",
      },
      {
        slug: "quickstart",
        title: "Quickstart",
        description: "Record a generation, a training run and an evaluation, and see them in the dashboard.",
      },
      {
        slug: "installation",
        title: "Installation and configuration",
        description: "Install the SDK, set the environment variables, and know what each setting does.",
      },
      {
        slug: "concepts",
        title: "Core concepts",
        description: "The records SynthGraph keeps, how they link into a lineage, and what cannot change once recorded.",
      },
    ],
  },
  {
    title: "SDK guides",
    pages: [
      {
        slug: "sdk/generations",
        title: "Record a generation",
        description: "Capture one run of a generator: its parameters, seed and outcome, including when it fails.",
      },
      {
        slug: "sdk/datasets",
        title: "Datasets and checksums",
        description: "Record a dataset by reference, version it, and optionally prove its bytes have not changed.",
      },
      {
        slug: "sdk/assets",
        title: "Assets",
        description: "Record the scenes, models and textures a generation used or produced.",
      },
      {
        slug: "sdk/training-runs",
        title: "Training runs and metrics",
        description: "Record a training run, move it through its lifecycle, and log metrics step by step.",
      },
      {
        slug: "sdk/evaluations",
        title: "Evaluations and checkpoints",
        description: "Record what a training run scored, on which dataset version, and at which checkpoint.",
      },
      {
        slug: "sdk/lineage",
        title: "Link data to results",
        description: "Say which data a run used, so the lineage graph shows recorded links and nothing guessed.",
      },
      {
        slug: "sdk/metric-directions",
        title: "Declare metric directions",
        description: "State whether a bigger or smaller value of a metric is better, once, per experiment.",
      },
      {
        slug: "sdk/resource-monitoring",
        title: "Resource monitoring and capture status",
        description: "Sample CPU, memory and GPU use during a run, and see how completely it was captured.",
      },
      {
        slug: "sdk/provenance",
        title: "Code and environment provenance",
        description: "What the SDK records about your code and machine by default, and how to control it.",
      },
      {
        slug: "sdk/integrations",
        title: "Framework integrations",
        description: "Helpers for stable-baselines3, skrl, rl_games, Isaac Lab, MuJoCo Playground and Weights & Biases.",
      },
      {
        slug: "sdk/errors",
        title: "Errors and retries",
        description: "The error types, what is retried, and what happens when a write fails in transit.",
      },
    ],
  },
];

export function docHref(slug: string): string {
  return slug === "index" ? "/docs" : `/docs/${slug}`;
}

export function allDocPages(): Array<DocPage & { section: string; href: string }> {
  return DOCS_NAV.flatMap((section) =>
    section.pages.map((page) => ({ ...page, section: section.title, href: docHref(page.slug) })),
  );
}

export function findDocPage(slug: string) {
  return allDocPages().find((page) => page.slug === slug) ?? null;
}

/** The page before and after this one in reading order, or null at either end. */
export function neighbours(slug: string) {
  const pages = allDocPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

/** Converts the URL segments after /docs into a slug. No segments means the introduction. */
export function slugFromSegments(segments: string[] | undefined): string {
  return segments && segments.length > 0 ? segments.join("/") : "index";
}
