"use client";

import { useState } from "react";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Section, SectionHeader } from "@/components/ui/Section";
import { DASHBOARD, demoAssets, demoEvaluation } from "@/data/demo-data";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  completed: "text-ok border-ok/30 bg-ok/[0.06]",
  running: "text-cyan border-cyan/30 bg-cyan/[0.06]",
  failed: "text-bad border-bad/30 bg-bad/[0.06]",
} as const;

const DETAIL = [
  {
    heading: "Generation",
    rows: [
      ["Generator", "Blender 4.2.0"],
      ["Seed", "42"],
      ["weather", "rain"],
      ["occlusion", "0.30"],
      ["camera_distance", "12"],
    ],
  },
  {
    heading: "Assets",
    rows: demoAssets.map((asset) => [asset.name, asset.used]),
  },
  {
    heading: "Dataset",
    rows: [
      ["Version", "rain_dataset:v7"],
      ["Reference", "s3://research/rain-v7"],
      ["Frames", "24,000"],
    ],
  },
  {
    heading: "Training",
    rows: [
      ["Model", "YOLO"],
      ["Framework", "PyTorch"],
      ["Epochs", "50"],
    ],
  },
  {
    heading: "Evaluation",
    rows: [
      ["mAP", demoEvaluation.mAP.toFixed(3)],
      ["Precision", demoEvaluation.precision.toFixed(2)],
      ["Recall", demoEvaluation.recall.toFixed(2)],
    ],
  },
] as const;

/**
 * An illustrative product surface. It is a sketch of the shape the interface
 * takes, not a screenshot of a shipped application.
 */
export function ProductPreview() {
  const [selected, setSelected] = useState(0);

  return (
    <Section id="preview">
      <div className="shell">
        <SectionHeader
          eyebrow="Interface"
          title="Every experiment, with its history attached."
          lede="Projects hold experiments. An experiment holds the generations and training runs that belong to it, and the evaluation results they produced."
        />

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface/60">
          <div className="flex items-center gap-3 border-b border-line bg-base/60 px-4 py-3">
            <span className="font-mono text-[12px] text-ink">SynthGraph</span>
            <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">
              Illustrative UI preview
            </span>
          </div>

          <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_minmax(0,0.9fr)]">
            {/* Projects */}
            <nav aria-label="Projects" className="border-b border-line p-4 lg:border-r lg:border-b-0">
              <p className="mono-label">Projects</p>
              <ul className="mt-3 flex flex-col gap-1">
                {DASHBOARD.projects.map((project) => (
                  <li key={project.name}>
                    <span
                      className={cn(
                        "flex items-baseline justify-between gap-2 rounded-md px-3 py-2 text-[13.5px]",
                        project.active
                          ? "bg-surface-2 text-ink"
                          : "text-ink-dim",
                      )}
                    >
                      {project.name}
                      <span className="font-mono text-[10.5px] text-ink-faint">
                        {project.experiments}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Experiment list */}
            <div className="border-b border-line p-4 lg:border-r lg:border-b-0">
              <p className="mono-label">Recent experiments</p>
              <ul className="mt-3 flex flex-col gap-2">
                {DASHBOARD.experiments.map((experiment, index) => (
                  <li key={experiment.name}>
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      aria-pressed={selected === index}
                      className={cn(
                        "w-full rounded-md border px-4 py-3 text-left transition-colors duration-200",
                        selected === index
                          ? "border-cyan/35 bg-cyan/[0.05]"
                          : "border-line bg-base/40 hover:border-line-strong",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] text-ink">{experiment.name}</span>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.12em] uppercase",
                            STATUS_STYLE[experiment.status],
                          )}
                        >
                          {experiment.status}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-dim">
                        <span>{experiment.generator}</span>
                        <span>{experiment.dataset}</span>
                        <span className={experiment.mAP === null ? "text-ink-faint" : "text-ok"}>
                          {experiment.mAP === null ? "no result yet" : `mAP ${experiment.mAP.toFixed(3)}`}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detail */}
            <div className="p-4">
              <p className="mono-label">
                {DASHBOARD.experiments[selected]?.name ?? "Experiment"}
              </p>
              <div className="mt-3 flex flex-col gap-4">
                {DETAIL.map((block) => (
                  <div key={block.heading} className="rounded-md border border-line bg-base/40 p-3">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-ink-dim uppercase">
                      {block.heading}
                    </p>
                    <dl className="mt-2 flex flex-col gap-1">
                      {block.rows.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3">
                          <dt className="font-mono text-[10.5px] text-ink-faint">{label}</dt>
                          <dd className="font-mono text-[11.5px] text-ink-muted">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Disclaimer className="mt-6">
          Illustrative interface preview using demo data. Not a screenshot of a shipped
          application, and not a customer result.
        </Disclaimer>
      </div>
    </Section>
  );
}
