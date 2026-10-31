import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const ITEMS = [
  {
    title: "Failures stay in the record",
    body: "A generation that fails keeps its parameters, its seed and its failed status. The parameters that did not work are exactly what you will want to find later.",
  },
  {
    title: "Links are recorded, not guessed",
    body: "A training run is linked to the data you said it used, and an evaluation to the data it was scored on. If you recorded nothing, the graph draws nothing, and tells you so.",
  },
  {
    title: "You declare what better means",
    body: "Is a bigger number better? For reward, yes. For loss, no. You declare it once per experiment, and nothing is inferred from a metric's name. Without a declaration there is no verdict.",
  },
  {
    title: "A grade for recording, not a promise",
    body: "The reproduction manifest lists what is known, what the SDK supplied, which inputs live outside SynthGraph, and what is missing. It grades how completely a run was recorded. It does not check that a rerun will match.",
  },
];

export function TrustedRecords() {
  return (
    <Section id="records">
      <div className="shell">
        <SectionHeader
          eyebrow="Records you can trust"
          title="It says what it knows, and what it does not."
          lede="Provenance is only useful if you can believe it. These are the rules the records follow."
        />

        <ul className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {ITEMS.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 0.05}>
              <h3 className="font-mono text-[14px] text-ink">{item.title}</h3>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[1.65] text-ink-muted">{item.body}</p>
            </Reveal>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/docs/reference/reproduction-manifest" variant="secondary">
            How the manifest is graded
          </ButtonLink>
          <ButtonLink href="/docs/reference/limits" variant="secondary">
            What it does not do
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
