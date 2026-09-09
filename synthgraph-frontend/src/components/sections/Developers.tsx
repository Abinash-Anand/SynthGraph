import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const PRINCIPLES = [
  ["Typed models", "Generators, parameters, reproducibility and references are typed rather than free-form dictionaries."],
  ["Canonical contract", "One provenance shape across every generator and training framework."],
  ["Flexible metadata", "Arbitrary domain metadata alongside the fields the model defines."],
  ["Safe retries", "Network failures during a long sweep should not corrupt a record."],
  ["Idempotency", "Repeating a call does not create a duplicate run."],
  ["Backend validation", "The server, not the client, decides what a valid record is."],
  ["Configurable endpoint", "Point the SDK at a hosted or self-controlled deployment."],
  ["Minimal instrumentation", "A small number of calls around code you do not have to restructure."],
  ["Storage neutrality", "References describe where data lives; SynthGraph does not require a particular provider."],
];

const ARCHITECTURE = [
  "Existing tools",
  "SynthGraph SDK",
  "HTTPS / JSON",
  "SynthGraph API",
  "Provenance storage",
];

export function Developers() {
  return (
    <Section id="developers">
      <div className="shell">
        <SectionHeader
          eyebrow="Developers"
          title="A Python SDK, not another platform you have to live inside."
          lede="The SDK is the primary integration surface. It wraps the generator and training code you already run, and sends structured records to the API."
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan" dot>
              Early development
            </Badge>
            <Badge tone="planned">Private integration stage</Badge>
          </div>
        </SectionHeader>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <Reveal>
            <p className="mono-label">Architecture</p>
            <ol className="mt-5 flex flex-col">
              {ARCHITECTURE.map((layer, index) => (
                <li key={layer}>
                  <div className="rounded-md border border-line bg-surface/50 px-4 py-3">
                    <span className="font-mono text-[13px] text-ink">{layer}</span>
                  </div>
                  {index < ARCHITECTURE.length - 1 ? (
                    <div className="py-1.5 pl-6">
                      <span aria-hidden className="block h-3 w-px bg-cyan/40" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>

            <p className="mt-8 max-w-[46ch] text-[14.5px] leading-[1.7] text-ink-muted">
              The SDK is in early development and is being integrated against real research
              workflows during the pilot. It is not a finished v1.0 release, and the surface is
              still changing.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mono-label">Design principles</p>
            <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {PRINCIPLES.map(([title, body]) => (
                <li key={title}>
                  <h3 className="font-mono text-[12.5px] tracking-[0.02em] text-ink">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-muted">{body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.16}>
          <div className="mt-12">
            <ButtonLink href="/developers" variant="secondary" size="lg" arrow>
              Read the developer overview
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
