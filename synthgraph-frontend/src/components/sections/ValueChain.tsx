import { StepCard } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { CardGlyph } from "@/components/ui/CardGlyph";

const STEPS = [
  {
    index: "01",
    title: "Capture",
    body: "Record generation parameters, seeds, generator versions, asset references and code metadata at the moment the run happens.",
    glyph: "capture" as const,
  },
  {
    index: "02",
    title: "Version",
    body: "Reference exact dataset and asset versions without moving the underlying data out of the storage it already lives in.",
    glyph: "version" as const,
  },
  {
    index: "03",
    title: "Connect",
    body: "Link generations, dataset versions, training runs and evaluation results into a single directed history.",
    glyph: "connect" as const,
  },
  {
    index: "04",
    title: "Search",
    body: "Find experiments by project, generator, time, metadata or the parameters that actually matter to the question you are asking.",
    glyph: "search" as const,
  },
  {
    index: "05",
    title: "Compare",
    body: "Inspect the differences between two experiments — configuration, inputs and results side by side.",
    glyph: "compare" as const,
  },
  {
    index: "06",
    title: "Reproduce",
    body: "Generate a reproduction manifest showing what is known, what is referenced externally, and what is missing.",
    glyph: "reproduce" as const,
  },
];

export function ValueChain() {
  return (
    <Section id="value">
      <div className="shell">
        <SectionHeader
          eyebrow="What it does"
          title="Capture once. Derive everything else."
          lede="Provenance is recorded at the point where the information still exists. Everything downstream — search, comparison, reproduction — reads from that same record."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.index} delay={index * 0.05} className="flex">
              <StepCard
                index={step.index}
                title={step.title}
                visual={<CardGlyph kind={step.glyph} />}
              >
                {step.body}
              </StepCard>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
