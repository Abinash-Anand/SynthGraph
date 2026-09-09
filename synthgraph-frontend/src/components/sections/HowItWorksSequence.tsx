"use client";

import { useEffect, useRef, useState } from "react";
import { StepGraphScene } from "@/components/3d/dynamic";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { COMPARISON_ROWS, REPRODUCTION_MANIFEST } from "@/data/demo-data";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  body: string;
  detail: string[];
  /** Records visible in the graph at this step. */
  visible: string[];
  focus: string | null;
  /** Steps that swap the visual for a DOM panel instead of the graph. */
  panel?: "compare" | "manifest";
};

const STEPS: Step[] = [
  {
    id: "instrument",
    title: "Instrument",
    body: "Add the SDK to the code you already run. The generator, the training script and the evaluation stay where they are; the calls around them record what happened.",
    detail: ["client.projects.create", "client.experiments.create", "code version captured"],
    visible: ["code"],
    focus: "code",
  },
  {
    id: "generate",
    title: "Generate",
    body: "When a generation runs, the generator and its version, the parameters, the seed and the referenced asset versions are written down as a record — before the result exists.",
    detail: ["generator: blender 4.2.0", "seed: 42", "occlusion: 0.30"],
    visible: ["code", "assets", "generation"],
    focus: "generation",
  },
  {
    id: "version",
    title: "Version",
    body: "The output is registered as a DatasetVersion: a specific version of a logical dataset, identified by reference rather than by folder name. The data itself does not move.",
    detail: ["rain_dataset:v7", "s3://research/rain-v7", "24,000 frames"],
    visible: ["code", "assets", "generation", "dataset"],
    focus: "dataset",
  },
  {
    id: "train",
    title: "Train",
    body: "A training run records its configuration and the exact dataset versions it consumed, so the link between the model and the data that produced it is explicit.",
    detail: ["YOLO · PyTorch", "50 epochs", "inputs: rain_dataset:v7"],
    visible: ["code", "assets", "generation", "dataset", "environment", "training"],
    focus: "training",
  },
  {
    id: "evaluate",
    title: "Evaluate",
    body: "Evaluation results attach to the run that produced them. A metric is never a loose number — it carries its whole upstream chain with it.",
    detail: ["mAP 0.724", "precision 0.78", "recall 0.69"],
    visible: ["code", "assets", "generation", "dataset", "environment", "training", "evaluation"],
    focus: "evaluation",
  },
  {
    id: "trace",
    title: "Trace",
    body: "From any record you can walk the graph in either direction: back from a metric to the parameters that produced it, or forward from a generation to everything that used it.",
    detail: ["upstream: parameters, assets, code", "downstream: runs, results"],
    visible: ["code", "assets", "generation", "dataset", "environment", "training", "evaluation"],
    focus: null,
  },
  {
    id: "compare",
    title: "Compare",
    body: "Two experiments align field by field. The differences in configuration and the differences in result are visible together — which is not the same as one explaining the other.",
    detail: ["occlusion 0.30 → 0.45", "dataset v7 → v8", "mAP 0.724 → 0.748"],
    visible: ["code", "assets", "generation", "dataset", "environment", "training", "evaluation"],
    focus: null,
    panel: "compare",
  },
  {
    id: "reproduce",
    title: "Reproduce",
    body: "A reproduction manifest gathers what was recorded and states what was not. Missing external dependencies are listed rather than assumed away.",
    detail: ["recorded configuration", "external references", "known gaps"],
    visible: ["code", "assets", "generation", "dataset", "environment", "training", "evaluation"],
    focus: null,
    panel: "manifest",
  },
];

/**
 * Eight steps with one sticky visual beside them. The active step is decided
 * by which heading is closest to the middle of the viewport, so the visual and
 * the prose never disagree.
 */
export function HowItWorksSequence() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const element of stepRefs.current) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  const step = STEPS[active] ?? STEPS[0];
  if (!step) return null;

  return (
    <div className="shell grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <ol className="flex min-w-0 flex-col">
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            data-index={index}
            ref={(element) => {
              stepRefs.current[index] = element;
            }}
            className="border-b border-line py-12 last:border-b-0 lg:py-16"
          >
            <div className="flex items-baseline gap-4">
              <span
                className={cn(
                  "font-mono text-[11px] transition-colors duration-300",
                  index === active ? "text-cyan" : "text-ink-faint",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2
                className={cn(
                  "text-[26px] leading-tight font-medium tracking-[-0.02em] transition-colors duration-300 md:text-[32px]",
                  index === active ? "text-ink" : "text-ink-muted",
                )}
              >
                {item.title}
              </h2>
            </div>
            <p className="mt-4 max-w-[54ch] text-[15.5px] leading-[1.68] text-ink-muted md:text-[16.5px]">
              {item.body}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {item.detail.map((entry) => (
                <li
                  key={entry}
                  className="rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-[11.5px] text-ink-dim"
                >
                  {entry}
                </li>
              ))}
            </ul>

            {/* On narrow screens the visual belongs with its step. */}
            <div className="mt-8 lg:hidden">
              <StepVisual step={item} />
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden min-w-0 lg:block">
        <div className="sticky top-[calc(var(--nav-h)+48px)]">
          <StepVisual step={step} />
        </div>
      </div>
    </div>
  );
}

function StepVisual({ step }: { step: Step }) {
  if (step.panel === "manifest") {
    return (
      <CodeBlock code={REPRODUCTION_MANIFEST} language="json" filename="manifest.json" />
    );
  }

  if (step.panel === "compare") {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface/60">
        <div className="border-b border-line bg-base/60 px-4 py-2.5">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-dim">
            EXP-00142 vs EXP-00131
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
          <caption className="sr-only">Illustrative comparison of two experiments</caption>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr
                key={row.parameter}
                className={cn(
                  "border-b border-line/60 last:border-b-0",
                  row.differs && "bg-warn/[0.035]",
                )}
              >
                <th
                  scope="row"
                  className="px-4 py-2.5 text-[13px] font-normal text-ink-muted"
                >
                  {row.parameter}
                </th>
                <td className="px-4 py-2.5 font-mono text-[12.5px] text-ink-dim">{row.a}</td>
                <td
                  className={cn(
                    "px-4 py-2.5 font-mono text-[12.5px]",
                    row.differs ? (row.metric ? "text-ok" : "text-warn") : "text-ink-dim",
                  )}
                >
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface/40 p-2">
      <StepGraphScene visible={step.visible} focus={step.focus} />
    </div>
  );
}
