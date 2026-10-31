import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PRODUCT } from "@/data/product";

const POINTS = [
  {
    title: "References, not bytes",
    body: "A dataset version is a URI, a name and optionally a checksum. SynthGraph never reads, uploads or stores your data. The only time the SDK reads your files is when you ask it to hash them.",
  },
  {
    title: "Open source, and yours to run",
    body: `The code is under the ${PRODUCT.license} license. Run the database, the backend and the dashboard yourself, and your records live in your own Postgres.`,
  },
  {
    title: "Plain about security",
    body: "API keys are stored as hashes and shown once. Every record is checked against its owner. Sign-in is rate limited. There are no certifications, and the docs say what the backend does not do.",
  },
  {
    title: "Environment details, on by default",
    body: "Creating a run records your Python version, operating system and git commit and branch, with credentials stripped from the remote. You can turn that off per call.",
  },
];

export function YourData() {
  return (
    <Section id="data">
      <div className="shell">
        <SectionHeader
          eyebrow="Your data"
          title="Your data stays where it is."
          lede="SynthGraph records where things are and how they were made. It is built to leave the data itself, and the decisions about it, with you."
        />

        <ul className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {POINTS.map((point, index) => (
            <Reveal as="li" key={point.title} delay={index * 0.05}>
              <h3 className="font-mono text-[14px] text-ink">{point.title}</h3>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[1.65] text-ink-muted">{point.body}</p>
            </Reveal>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/docs/operate/self-hosting" variant="secondary">
            Self-hosting
          </ButtonLink>
          <ButtonLink href="/docs/operate/security" variant="secondary">
            Security
          </ButtonLink>
          <ButtonLink href={PRODUCT.repoUrl} variant="secondary">
            Source on GitHub
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
