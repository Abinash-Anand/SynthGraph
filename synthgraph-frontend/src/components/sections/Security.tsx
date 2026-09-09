import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const MEASURES = [
  ["Transport security", "API traffic is served over HTTPS/TLS."],
  ["Server-side authorization", "Access decisions are made by the API, not by the client."],
  ["Protected API keys", "Keys are treated as credentials and are not written to logs."],
  ["No secrets in logs", "Structured logging excludes credential material."],
  ["Data minimisation", "Provenance records hold metadata and references rather than the datasets themselves."],
  ["Ownership boundaries", "Records belong to a user and a project, and access follows that boundary."],
  ["Deployment choice", "Cloud-hosted or local/self-controlled deployment, with the same provenance model."],
  ["Migration-backed persistence", "Schema changes are applied through versioned migrations."],
];

export function Security() {
  return (
    <Section id="security">
      <div className="shell">
        <SectionHeader
          eyebrow="Security and privacy"
          title="Research provenance without unnecessary data collection."
          lede="The system is designed to hold as little as it needs to. Most of what makes an experiment reproducible is metadata — and metadata is what SynthGraph stores."
        />

        <ul className="mt-14 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {MEASURES.map(([title, body], index) => (
            <Reveal as="li" key={title} delay={index * 0.04}>
              <div className="flex gap-3">
                <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-cyan" />
                <div>
                  <h3 className="text-[15.5px] text-ink">{title}</h3>
                  <p className="mt-1 text-[14px] leading-[1.6] text-ink-muted">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2}>
          <div className="mt-12 rounded-lg border border-line bg-surface/50 p-6">
            <p className="mono-label">On compliance claims</p>
            <p className="mt-3 max-w-[76ch] text-[14.5px] leading-[1.7] text-ink-muted">
              SynthGraph is designed with privacy and security requirements in mind. Formal legal
              compliance claims require appropriate legal review, and this site does not make
              them. You will not find certification badges here, because there are none to show
              yet.
            </p>
            <div className="mt-6">
              <ButtonLink href="/security" variant="secondary" arrow>
                Security overview
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
