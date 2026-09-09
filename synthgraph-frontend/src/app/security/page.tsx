import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { CloudLocal } from "@/components/sections/CloudLocal";
import { ButtonLink } from "@/components/ui/Button";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How SynthGraph approaches authentication, authorization, data isolation, credential protection, transport security, logging, privacy by design and deployment choice.",
};

const FEATURES: Feature[] = [
  {
    id: "principles",
    eyebrow: "Security principles",
    title: "Hold as little as the job requires.",
    body: "Most of what makes an experiment reproducible is metadata: parameters, versions, seeds, references. SynthGraph is built around storing that, which means the system does not need custody of the datasets themselves in order to be useful.",
  },
  {
    id: "authentication",
    eyebrow: "Authentication",
    title: "API keys are credentials.",
    body: "The SDK authenticates with an API key supplied by the environment. Keys are treated as secrets: not committed to research code, not printed in output, and not written into logs.",
  },
  {
    id: "authorization",
    eyebrow: "Authorization",
    title: "Access decisions belong to the server.",
    body: "Authorization is enforced by the API rather than by the client. A client that asks for a record it should not have does not receive it, regardless of what the client believes about itself.",
  },
  {
    id: "isolation",
    eyebrow: "Data isolation",
    title: "Records belong to an owner and a project.",
    body: "Ownership runs User → Project → Experiment, and access follows that structure. Provenance from one group’s project is not visible to another’s.",
  },
  {
    id: "credentials",
    eyebrow: "Credential protection",
    title: "No secrets in logs.",
    body: "Structured logging is used for operational visibility, and credential material is excluded from it. Log output is intended to be safe to read and safe to keep.",
  },
  {
    id: "transport",
    eyebrow: "Transport security",
    title: "HTTPS/TLS between the SDK and the API.",
    body: "All API traffic is served over HTTPS. The SDK’s endpoint is configurable so the same code can talk to a hosted deployment or one inside your own network.",
  },
  {
    id: "logging",
    eyebrow: "Logging",
    title: "Structured, operational, and bounded.",
    body: "Logs exist to answer operational questions — whether a request succeeded, how long it took, what failed. They are not a second copy of your research data.",
  },
  {
    id: "privacy",
    eyebrow: "Privacy by design",
    title: "Data minimisation as a default, not a setting.",
    body: "Because the product records references and metadata rather than datasets, the smallest useful footprint is also the normal one. Nothing has to be turned on to avoid collecting more than necessary.",
  },
  {
    id: "storage",
    eyebrow: "Storage choices",
    title: "Your data stays in storage you control.",
    body: "Generated datasets can remain on the researcher’s filesystem, on lab storage, or in object storage. SynthGraph records the reference, the version and — where available — the checksum.",
  },
  {
    id: "deployment",
    eyebrow: "Deployment model",
    title: "Cloud-hosted or self-controlled.",
    body: "The same provenance model is intended to run in a hosted deployment or one operated inside an institution’s own environment, with the SDK pointed at a different endpoint.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Research provenance without unnecessary data collection."
        lede="This page describes how SynthGraph is designed. It does not present certifications, audits or compliance claims, because there are none to present."
      >
        <ButtonLink href="/demo" arrow>
          Request a Demo
        </ButtonLink>
      </PageHero>

      <section className="border-t border-line">
        <div className="shell">
          <Reveal>
            <div className="rounded-lg border border-warn/25 bg-warn/[0.03] p-6">
              <p className="font-mono text-[10px] tracking-[0.16em] text-warn uppercase">
                What this page does not claim
              </p>
              <p className="mt-3 max-w-[76ch] text-[15px] leading-[1.7] text-ink-muted">
                SynthGraph is designed with privacy and security requirements in mind. Formal
                legal compliance claims — SOC 2, ISO 27001, GDPR conformance and similar —
                require appropriate legal and audit review, and none are claimed here. If your
                institution needs a specific assurance, tell us in a demo request and we will
                tell you plainly where things actually stand.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-8">
        <div className="shell">
          <FeatureList features={FEATURES} />
        </div>
      </section>

      <CloudLocal />
      <FinalCTA />
    </>
  );
}
