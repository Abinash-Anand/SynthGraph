"use client";

import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Section, SectionHeader } from "@/components/ui/Section";
import { SEARCH_FILTERS, SEARCH_RESULTS } from "@/data/demo-data";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * A simulated query surface. Filters land one at a time and the result set
 * narrows with them, so the interaction — not just the screenshot — carries
 * the idea.
 */
export function SearchSection() {
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: "-120px" });
  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);
  // Reduced-motion visitors see the finished query rather than the sequence.
  const applied = reducedMotion ? SEARCH_FILTERS.length : revealed;

  useEffect(() => {
    if (reducedMotion || !inView) return;

    const timers = SEARCH_FILTERS.map((_, index) =>
      window.setTimeout(() => setRevealed(index + 1), 500 + index * 620),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, reducedMotion]);

  const filtered = applied >= SEARCH_FILTERS.length;

  return (
    <Section id="search">
      <div className="shell" ref={ref}>
        <SectionHeader
          eyebrow="Search"
          title="Stop searching through old scripts. Search the experiment history."
          lede="Experiments are queryable by project, generator, time, metadata and the parameters recorded on the run itself."
        />

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface/60">
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-base/60 px-4 py-3">
            <div className="flex gap-1.5" aria-hidden>
              {["#2a3345", "#2a3345", "#2a3345"].map((color, index) => (
                <span
                  key={index}
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] tracking-[0.1em] text-ink-dim">
              synthgraph · experiments
            </p>
            <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">
              Illustrative UI
            </span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Query panel */}
            <div className="border-b border-line p-5 lg:border-r lg:border-b-0">
              <p className="mono-label">Query</p>
              <ul className="mt-4 flex flex-col gap-2">
                {SEARCH_FILTERS.map((filter, index) => {
                  const active = index < applied;
                  return (
                    <li
                      key={filter.key}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-[12px]",
                        "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active
                          ? "translate-x-0 border-cyan/35 bg-cyan/[0.06] opacity-100"
                          : "-translate-x-1 border-line opacity-35",
                      )}
                    >
                      <span className="text-ink-dim">{filter.key}</span>
                      <span className="text-ink-faint">{filter.op}</span>
                      <span className="text-cyan">{filter.value}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-[1.7] text-ink-faint">
                {applied} of {SEARCH_FILTERS.length} filters applied
              </p>
            </div>

            {/* Results */}
            <div className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="mono-label">Results</p>
                <p className="font-mono text-[11px] text-ink-dim">
                  {filtered
                    ? `${SEARCH_RESULTS.filter((result) => result.matched).length} experiments`
                    : `${SEARCH_RESULTS.length} experiments`}
                </p>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {SEARCH_RESULTS.map((result, index) => {
                  const excluded = filtered && !result.matched;
                  return (
                    <li
                      key={result.id}
                      className={cn(
                        "rounded-md border px-4 py-3 transition-all duration-500",
                        "ease-[cubic-bezier(0.22,1,0.36,1)]",
                        excluded
                          ? "border-line/50 opacity-25"
                          : "border-line bg-base/40 opacity-100",
                      )}
                      style={{ transitionDelay: `${index * 60}ms` }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-mono text-[12.5px] text-cyan">{result.id}</span>
                        <span className="text-[14px] text-ink">{result.name}</span>
                        <span className="ml-auto font-mono text-[12.5px] text-ok">
                          mAP {result.mAP.toFixed(3)}
                        </span>
                      </div>
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {[
                          ["generator", result.generator],
                          ["seed", String(result.seed)],
                          ["occlusion", result.occlusion.toFixed(2)],
                          ["dataset", result.dataset],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-baseline gap-1.5">
                            <dt className="font-mono text-[10.5px] text-ink-faint">{label}</dt>
                            <dd className="font-mono text-[11.5px] text-ink-muted">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <Disclaimer className="mt-6" />
      </div>
    </Section>
  );
}
