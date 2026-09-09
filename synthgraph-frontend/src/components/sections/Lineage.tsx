import { LineageScene } from "@/components/3d/dynamic";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const CHAIN = [
  {
    label: "Generation",
    body: "The run that produced data: generator and version, parameters, seed, referenced asset versions, code version.",
  },
  {
    label: "DatasetVersion",
    body: "A specific version of a logical dataset, identified by reference and version rather than by folder name.",
  },
  {
    label: "TrainingRun",
    body: "The training configuration and the exact dataset versions it consumed.",
  },
  {
    label: "EvaluationResult",
    body: "The metric, attached to the run that produced it and, through it, to everything upstream.",
  },
];

export function Lineage() {
  return (
    <Section id="lineage">
      <div className="shell">
        <SectionHeader
          eyebrow="Lineage"
          title="See the experiment, not just the metric."
          lede="A metric tells you what happened. Lineage helps you understand why."
        />
      </div>

      <div className="mt-12 lg:mt-16">
        <div className="shell">
          <LineageScene />
        </div>
      </div>

      <div className="shell mt-10">
        <ol className="grid gap-x-10 gap-y-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {CHAIN.map((item, index) => (
            <Reveal as="li" key={item.label} delay={index * 0.06}>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-ink-faint">0{index + 1}</span>
                <h3 className="font-mono text-[14px] text-ink">{item.label}</h3>
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-muted">{item.body}</p>
            </Reveal>
          ))}
        </ol>
        <Disclaimer className="mt-8" />
      </div>
    </Section>
  );
}
