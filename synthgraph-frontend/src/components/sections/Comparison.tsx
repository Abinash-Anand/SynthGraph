import { Disclaimer } from "@/components/ui/Disclaimer";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { COMPARISON_ROWS } from "@/data/demo-data";
import { cn } from "@/lib/utils";

export function Comparison() {
  const differences = COMPARISON_ROWS.filter((row) => row.differs).length;

  return (
    <Section id="comparison">
      <div className="shell">
        <SectionHeader
          eyebrow="Comparison"
          title="Compare experiments by what changed."
          lede="Two experiments, aligned field by field. The differences are marked so the configuration change and the result change are visible together."
        />

        <Reveal>
          <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-base/60 px-5 py-3">
              <p className="font-mono text-[11px] tracking-[0.1em] text-ink-dim">
                EXP-00142 vs EXP-00131
              </p>
              <p className="font-mono text-[10px] tracking-[0.14em] text-warn uppercase">
                {differences} fields differ
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">
                  Field-by-field comparison of two illustrative experiments
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    {["Parameter", "Experiment A", "Experiment B"].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-3 font-mono text-[10.5px] tracking-[0.14em] text-ink-dim uppercase"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
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
                        className="px-5 py-3 text-[13.5px] font-normal text-ink-muted"
                      >
                        {row.parameter}
                      </th>
                      <td
                        className={cn(
                          "px-5 py-3 font-mono text-[13px]",
                          row.differs ? "text-ink" : "text-ink-dim",
                        )}
                      >
                        {row.a}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "font-mono text-[13px]",
                            row.differs
                              ? row.metric
                                ? "text-ok"
                                : "text-warn"
                              : "text-ink-dim",
                          )}
                        >
                          {row.b}
                        </span>
                        {row.differs ? (
                          <span className="ml-2 font-mono text-[9.5px] tracking-[0.12em] text-ink-faint uppercase">
                            changed
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mt-8 max-w-[74ch] rounded-lg border border-line bg-surface/50 p-5 text-[14.5px] leading-[1.7] text-ink-muted">
            A comparison shows which recorded fields differ and which results differ. It does
            not establish that one caused the other — two runs can differ in a parameter and a
            metric without the parameter being responsible. SynthGraph’s job is to make the
            differences inspectable; the inference stays with the researcher.
          </p>
        </Reveal>

        <Disclaimer className="mt-6" />
      </div>
    </Section>
  );
}
