import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const RUNS = [
  {
    id: "GEN-004817",
    status: "failed" as const,
    reason: "renderer exited at frame 812",
    detail: ["Blender 4.2.0", "seed 19", "occlusion 0.62"],
  },
  {
    id: "GEN-004821",
    status: "completed" as const,
    reason: "24,000 frames written",
    detail: ["Blender 4.2.0", "seed 42", "occlusion 0.30"],
  },
];

export function FailurePreservation() {
  return (
    <Section id="failures">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <SectionHeader
            eyebrow="Failures"
            title="Failed experiments are still evidence."
            lede="A generation that failed halfway through still tells you which parameters you have already tried and what happened when you did. Failed runs keep their provenance and stay part of the experiment history rather than disappearing from it."
          />

          <Reveal delay={0.06}>
            <ul className="flex flex-col gap-3">
              {RUNS.map((run) => {
                const failed = run.status === "failed";
                return (
                  <li
                    key={run.id}
                    className={
                      failed
                        ? "rounded-lg border border-bad/30 bg-bad/[0.03] p-5"
                        : "rounded-lg border border-ok/25 bg-ok/[0.03] p-5"
                    }
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-mono text-[13px] text-ink">{run.id}</span>
                      <span
                        className={
                          failed
                            ? "font-mono text-[10px] tracking-[0.14em] text-bad uppercase"
                            : "font-mono text-[10px] tracking-[0.14em] text-ok uppercase"
                        }
                      >
                        status: {run.status}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[12px] text-ink-dim">{run.reason}</p>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
                      {run.detail.map((item) => (
                        <li key={item} className="font-mono text-[11.5px] text-ink-muted">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-cyan/80 uppercase">
                      provenance preserved
                    </p>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
