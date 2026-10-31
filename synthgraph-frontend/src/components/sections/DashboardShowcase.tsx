"use client";

import Image from "next/image";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

const SCREENS = [
  {
    id: "overview",
    label: "Overview",
    src: "/screens/overview.webp",
    width: 1800,
    height: 1126,
    alt: "The experiment overview: counts, runs that need attention with the reason in words, run status, a provenance checklist and result ranges.",
    caption:
      "What needs a look, in words. The backend decides which runs are flagged, from five fixed checks, and none of them judges how a run performed.",
  },
  {
    id: "lineage",
    label: "Lineage",
    src: "/screens/lineage.webp",
    width: 1800,
    height: 1126,
    alt: "The lineage graph: five generations, their dataset versions, four training runs and a collapsed group of twelve evaluations, joined by recorded links.",
    caption:
      "Generations to datasets to runs to evaluations. Every line is a link someone recorded. The failed generation is marked, and the one with no link says so instead of being connected by guesswork.",
  },
  {
    id: "metrics",
    label: "Metrics",
    src: "/screens/metrics.webp",
    width: 1800,
    height: 1126,
    alt: "A training run's loss and mAP50 curves, with chart, table and compare views and smoothing, log scale and normalize toggles.",
    caption:
      "Training curves, step by step. When you have declared which direction is better for a metric, the dashboard can say whether it is improving. Without it, it shows the values and no verdict.",
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    src: "/screens/leaderboard.webp",
    width: 1500,
    height: 492,
    alt: "The efficiency leaderboard, ranking mAP50 on one evaluation set, with a note that scores from different sets are never combined.",
    caption:
      "Runs are ranked only against runs scored on the same evaluation set. A score on clear weather and a score on heavy rain are never blended into one number.",
  },
  {
    id: "reproduction",
    label: "Reproduction",
    src: "/screens/reproduction.webp",
    width: 1800,
    height: 1126,
    alt: "The reproduction view: how completely each generation was recorded, what is known, supplied, outside SynthGraph and missing.",
    caption:
      "How completely each generation was recorded. The grade counts recorded fields. It does not claim a rerun will match, and the page says so.",
  },
] as const;

export function DashboardShowcase() {
  const [activeId, setActiveId] = useState<(typeof SCREENS)[number]["id"]>("lineage");
  const active = SCREENS.find((screen) => screen.id === activeId) ?? SCREENS[0];

  return (
    <Section id="dashboard">
      <div className="shell">
        <SectionHeader
          eyebrow="The dashboard"
          title="Everything you recorded, in one workspace."
          lede="Real screens from a demo project. Each view reads the same records, and each one says what it is built from."
        />

        <Reveal>
          <div className="mt-12">
            <div role="tablist" aria-label="Dashboard views" className="flex flex-wrap gap-2">
              {SCREENS.map((screen) => (
                <button
                  key={screen.id}
                  type="button"
                  role="tab"
                  id={`screen-tab-${screen.id}`}
                  aria-selected={active.id === screen.id}
                  aria-controls="screen-panel"
                  onClick={() => setActiveId(screen.id)}
                  className={cn(
                    "rounded-md border px-4 py-2 font-mono text-[12.5px] transition-colors",
                    active.id === screen.id
                      ? "border-cyan/40 bg-cyan/5 text-ink"
                      : "border-line text-ink-dim hover:border-line-strong hover:text-ink-muted",
                  )}
                >
                  {screen.label}
                </button>
              ))}
            </div>

            <div id="screen-panel" role="tabpanel" aria-labelledby={`screen-tab-${active.id}`} className="mt-6">
              <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl">
                <Image
                  key={active.id}
                  src={active.src}
                  width={active.width}
                  height={active.height}
                  alt={active.alt}
                  sizes="(min-width: 1240px) 1160px, 100vw"
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-5 max-w-[78ch] text-[15px] leading-[1.65] text-ink-muted">{active.caption}</p>
              <p className="mt-3 font-mono text-[11px] text-ink-faint">
                Demo data: an invented adverse-weather detection project, recorded through the SDK.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
