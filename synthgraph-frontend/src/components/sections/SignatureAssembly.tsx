"use client";

import { AssemblyScene } from "@/components/3d/dynamic";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { clamp, remap } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    at: 0,
    label: "Scattered",
    title: "Artefacts with no relationship",
    body: "Code, assets, a generator, a dataset folder, a metrics dashboard, a page of notes. Each one exists. None of them points at the others.",
  },
  {
    at: 0.28,
    label: "Structured",
    title: "Each artefact becomes a record",
    body: "The generation, the dataset version, the training run and the evaluation result become typed records with fields you can query rather than free text you have to read.",
  },
  {
    at: 0.52,
    label: "Connected",
    title: "Records gain relationships",
    body: "This dataset version came from that generation. This training run consumed those dataset versions. This metric belongs to that run.",
  },
  {
    at: 0.76,
    label: "Reproducible",
    title: "The lineage yields a manifest",
    body: "What was recorded, what is referenced externally, and what is missing — assembled into one document you can act on.",
  },
];

/**
 * The homepage's central scroll sequence. A sticky canvas is driven by the
 * scroll position of a tall track; the copy beside it changes in step so the
 * argument is readable without the visual, and vice versa.
 */
export function SignatureAssembly() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();

  // The track is taller than the viewport; map its middle to 0 → 1.
  const t = clamp(remap(progress, 0.08, 0.82, 0, 1), 0, 1);
  const activeIndex = STAGES.reduce(
    (current, stage, index) => (t >= stage.at ? index : current),
    0,
  );

  return (
    <section
      ref={ref}
      aria-label="How scattered research artefacts become a reproducible history"
      className="relative border-t border-line"
    >
      <div className="relative h-[320vh]">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="grid-field pointer-events-none absolute inset-0" aria-hidden />

          <div className="absolute inset-0">
            <AssemblyScene progress={t} />
          </div>

          {/* A soft scrim keeps the copy readable over the moving graph. */}
          <div
            className="pointer-events-none absolute inset-0 lg:hidden"
            style={{
              background:
                "linear-gradient(180deg, var(--color-void) 0%, color-mix(in oklab, var(--color-void) 92%, transparent) 32%, transparent 58%, color-mix(in oklab, var(--color-void) 85%, transparent) 88%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] lg:block"
            style={{
              background:
                "linear-gradient(100deg, var(--color-void) 0%, color-mix(in oklab, var(--color-void) 88%, transparent) 42%, transparent 100%)",
            }}
            aria-hidden
          />

          <div className="shell relative flex h-full flex-col justify-between py-[calc(var(--nav-h)+28px)]">
            <div className="max-w-[34ch] lg:my-auto">
              <p className="mono-label">Capture once</p>
              <div className="relative mt-5 min-h-[190px] sm:min-h-[170px]">
                {STAGES.map((stage, index) => (
                  <div
                    key={stage.label}
                    aria-hidden={index !== activeIndex}
                    className={cn(
                      "absolute inset-0 transition-[opacity,transform] duration-500",
                      "ease-[cubic-bezier(0.22,1,0.36,1)]",
                      index === activeIndex
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-3 opacity-0",
                    )}
                  >
                    <h2 className="text-[26px] leading-[1.15] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
                      {stage.title}
                    </h2>
                    <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.65] text-ink-muted md:text-[16.5px]">
                      {stage.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage rail — also the accessible summary of the sequence. */}
            <ol className="mt-8 flex shrink-0 flex-wrap gap-x-6 gap-y-2">
              {STAGES.map((stage, index) => (
                <li key={stage.label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "block h-px transition-all duration-500",
                      index === activeIndex ? "w-8 bg-cyan" : "w-4 bg-line-strong",
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors duration-500",
                      index === activeIndex ? "text-cyan" : "text-ink-faint",
                    )}
                  >
                    {stage.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
