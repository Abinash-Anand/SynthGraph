import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

const FRAGMENTED = [
  { step: "Generate", note: "hours of compute", broken: false },
  { step: "Save config somewhere", note: "script · notebook · simulator UI", broken: true },
  { step: "Train model", note: "separate machine, separate repo", broken: false },
  { step: "Log metrics elsewhere", note: "experiment tracker", broken: true },
  { step: "Compare spreadsheets", note: "hand-copied numbers", broken: true },
  { step: "Months later", note: "“What exactly did we run?”", broken: true, terminal: true },
];

const CONNECTED = [
  { label: "Generation", detail: "generator · parameters · seed" },
  { label: "DatasetVersion", detail: "referenced by exact version" },
  { label: "TrainingRun", detail: "configuration · inputs" },
  { label: "EvaluationResult", detail: "metric, tied to its source" },
];

export function Problem() {
  return (
    <Section id="problem">
      <div className="shell">
        <SectionHeader
          eyebrow="The problem"
          titleClassName="md:max-w-[34ch]"
          title={
            <>
              Synthetic-data experiments are easy to run.
              <br className="hidden md:block" /> Hard to reconstruct.
            </>
          }
          lede="A generation can take hours of compute. The configuration that produced it may live in a script, a notebook, a simulator, a local file, an experiment tracker, or someone’s memory."
        />

        <div className="mt-16 grid gap-10 lg:mt-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-14">
          {/* Today */}
          <Reveal className="min-w-0">
            <p className="mono-label">Today</p>
            <ol className="mt-6 flex flex-col">
              {FRAGMENTED.map((item, index) => (
                <li key={item.step} className="relative">
                  <div
                    className={cn(
                      "flex items-baseline gap-4 rounded-md border px-4 py-3.5",
                      item.terminal
                        ? "border-bad/30 bg-bad/[0.04]"
                        : "border-line bg-surface/50",
                    )}
                  >
                    <span className="font-mono text-[11px] text-ink-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[15px]",
                          item.terminal ? "text-bad" : "text-ink",
                        )}
                      >
                        {item.step}
                      </span>
                      <span className="block font-mono text-[11.5px] text-ink-dim">
                        {item.note}
                      </span>
                    </span>
                  </div>

                  {index < FRAGMENTED.length - 1 ? (
                    <div className="flex items-center gap-3 py-2 pl-8">
                      <span
                        aria-hidden
                        className={cn(
                          "block h-4 w-px",
                          item.broken ? "bg-warn/45" : "bg-line-strong",
                        )}
                        style={
                          item.broken
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 5px)",
                                backgroundColor: "transparent",
                                color: "var(--color-warn)",
                              }
                            : undefined
                        }
                      />
                      {item.broken ? (
                        <span className="font-mono text-[10px] tracking-[0.14em] text-warn/80 uppercase">
                          link not recorded
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </Reveal>

          {/* Divider */}
          <div className="hidden lg:flex lg:flex-col lg:items-center">
            <span className="block h-full w-px bg-line" aria-hidden />
          </div>

          {/* With SynthGraph */}
          <Reveal delay={0.1} className="min-w-0">
            <p className="mono-label">With SynthGraph</p>
            <ol className="mt-6 flex flex-col">
              {CONNECTED.map((item, index) => (
                <li key={item.label}>
                  <div className="flex items-baseline gap-4 rounded-md border border-cyan/20 bg-cyan/[0.03] px-4 py-3.5">
                    <span className="font-mono text-[11px] text-cyan/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[14px] text-ink">{item.label}</span>
                      <span className="block font-mono text-[11.5px] text-ink-dim">
                        {item.detail}
                      </span>
                    </span>
                  </div>
                  {index < CONNECTED.length - 1 ? (
                    <div className="flex items-center gap-3 py-2 pl-8">
                      <span aria-hidden className="block h-4 w-px bg-cyan/40" />
                      <span className="font-mono text-[10px] tracking-[0.14em] text-cyan/60 uppercase">
                        recorded relationship
                      </span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>

            <p className="mt-8 max-w-[46ch] text-[15px] leading-[1.65] text-ink-muted">
              The same work, with the connections between steps written down at the moment
              they exist — rather than reconstructed from memory months later.
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
