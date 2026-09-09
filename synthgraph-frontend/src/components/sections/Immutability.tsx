import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

const FROZEN = [
  "generator and version",
  "parameters",
  "seed",
  "code version",
  "environment metadata",
  "input DatasetVersions",
  "AssetVersions",
];

const MUTABLE = ["status", "timestamps", "completion metadata", "error detail"];

const LIFECYCLES = [
  { states: ["PENDING", "RUNNING", "COMPLETED"], tone: "ok" as const },
  { states: ["PENDING", "RUNNING", "FAILED"], tone: "bad" as const },
];

function StateChain({ states, tone }: { states: string[]; tone: "ok" | "bad" }) {
  return (
    <ol className="flex flex-col">
      {states.map((state, index) => {
        const terminal = index === states.length - 1;
        const frozen = index >= 1;
        return (
          <li key={state}>
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-4 py-3",
                terminal && tone === "ok" && "border-ok/30 bg-ok/[0.04]",
                terminal && tone === "bad" && "border-bad/30 bg-bad/[0.04]",
                !terminal && "border-line bg-surface/50",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[12.5px] tracking-[0.14em]",
                  terminal && tone === "ok" && "text-ok",
                  terminal && tone === "bad" && "text-bad",
                  !terminal && "text-ink",
                )}
              >
                {state}
              </span>
              {frozen ? (
                <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] text-cyan/80 uppercase">
                  <LockIcon />
                  inputs frozen
                </span>
              ) : (
                <span className="font-mono text-[9.5px] tracking-[0.12em] text-ink-faint uppercase">
                  editable
                </span>
              )}
            </div>
            {!terminal ? (
              <div className="py-1.5 pl-6">
                <span aria-hidden className="block h-3 w-px bg-line-strong" />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden>
      <rect x="0.6" y="4.4" width="7.8" height="6" rx="1.4" stroke="currentColor" strokeWidth="1" />
      <path d="M2.6 4.4V3a1.9 1.9 0 0 1 3.8 0v1.4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function Immutability() {
  return (
    <Section id="immutability">
      <div className="shell">
        <SectionHeader
          eyebrow="Record lifecycle"
          title="Once a run starts, its inputs stop moving."
          lede="A provenance record is only useful if it still describes what actually ran. When a generation moves out of PENDING, the fields that define the run are fixed; only operational fields keep changing."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10">
          {LIFECYCLES.map((lifecycle, index) => (
            <Reveal key={lifecycle.states.join("-")} delay={index * 0.08}>
              <p className="mono-label">
                {lifecycle.tone === "ok" ? "Successful run" : "Failed run"}
              </p>
              <div className="mt-4">
                <StateChain states={lifecycle.states} tone={lifecycle.tone} />
              </div>
            </Reveal>
          ))}

          <Reveal delay={0.16}>
            <p className="mono-label">Frozen at RUNNING</p>
            <ul className="mt-4 flex flex-col gap-1.5">
              {FROZEN.map((field) => (
                <li
                  key={field}
                  className="flex items-baseline gap-2 font-mono text-[12px] text-ink-muted"
                >
                  <span aria-hidden className="text-cyan/70">
                    ·
                  </span>
                  {field}
                </li>
              ))}
            </ul>

            <p className="mono-label mt-8">Still changes</p>
            <ul className="mt-4 flex flex-col gap-1.5">
              {MUTABLE.map((field) => (
                <li
                  key={field}
                  className="flex items-baseline gap-2 font-mono text-[12px] text-ink-dim"
                >
                  <span aria-hidden className="text-ink-faint">
                    ·
                  </span>
                  {field}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
