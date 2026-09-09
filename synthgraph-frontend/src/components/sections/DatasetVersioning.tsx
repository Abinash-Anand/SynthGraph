import { DatasetVersionScene } from "@/components/3d/dynamic";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const USAGE = [
  ["Generation A", "produced", "rain_dataset:v1"],
  ["Generation B", "produced", "rain_dataset:v3"],
  ["Training run", "consumed", "rain_dataset:v1 + v3"],
  ["Evaluation", "ran against", "rain_dataset:v3"],
];

export function DatasetVersioning() {
  return (
    <Section id="dataset-versioning">
      <div className="shell">
        <SectionHeader
          eyebrow="Dataset versioning"
          title="A dataset is not a single thing. It has history."
          lede="A logical dataset can evolve. SynthGraph records the exact DatasetVersion used by a generation, training run or evaluation, so historical lineage stays meaningful after the dataset moves on."
        />

        <div className="mt-12">
          <DatasetVersionScene />
        </div>

        <div className="mt-10 border-t border-line pt-10">
          <ul className="grid gap-3 sm:grid-cols-2">
            {USAGE.map(([subject, verb, object], index) => (
              <Reveal as="li" key={subject} delay={index * 0.06}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-line bg-surface/50 px-4 py-3">
                  <span className="font-mono text-[13px] text-ink">{subject}</span>
                  <span className="text-[13px] text-ink-dim">{verb}</span>
                  <span className="font-mono text-[13px] text-blue">{object}</span>
                </div>
              </Reveal>
            ))}
          </ul>
          <Disclaimer className="mt-6" />
        </div>
      </div>
    </Section>
  );
}
