import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const AUDIENCES = [
  {
    title: "PhD researchers",
    body: "Keep experiments traceable while working toward papers, theses and reproducibility supplements — including the runs that did not make it into the results table.",
  },
  {
    title: "Postdoctoral researchers",
    body: "Manage repeated experiments across long projects without relying on scattered notes, folder names and scripts that have since been edited.",
  },
  {
    title: "Research labs",
    body: "Preserve experiment knowledge across projects, machines and researchers, so a run stays legible after the person who ran it has moved on.",
  },
  {
    title: "Research engineers",
    body: "Connect generation infrastructure to downstream training and evaluation, and give the rest of the lab a consistent record of what produced what.",
  },
];

export function Researchers() {
  return (
    <Section id="researchers">
      <div className="shell">
        <SectionHeader
          eyebrow="Who it is for"
          title="Built around how research actually happens."
          lede="SynthGraph is designed for computer-vision research groups working with synthetic data — not for a generic enterprise workflow."
        />

        <ul className="mt-14 grid gap-4 md:grid-cols-2">
          {AUDIENCES.map((audience, index) => (
            <Reveal as="li" key={audience.title} delay={index * 0.06} className="flex">
              <Card interactive className="flex w-full flex-col gap-3 p-6">
                <h3 className="text-[19px] leading-tight font-medium tracking-[-0.01em] text-ink">
                  {audience.title}
                </h3>
                <p className="text-[15px] leading-[1.65] text-ink-muted">{audience.body}</p>
              </Card>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/demo" size="lg" arrow>
              Request a Research Demo
            </ButtonLink>
            <ButtonLink href="/research" size="lg" variant="secondary">
              For Researchers
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
