import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ButtonLink } from "@/components/ui/Button";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { PRODUCT } from "@/data/product";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How SynthGraph handles API keys, passwords, access and your data, what it does not do, and how to report a vulnerability.",
};

const FEATURES: Feature[] = [
  {
    id: "data",
    eyebrow: "Your data",
    title: "References and metadata, not the data.",
    body: "A dataset or asset version is a URI, a name and optionally a checksum. SynthGraph never reads, uploads or stores the data. The only time the SDK reads your files is when you ask it to compute a checksum.",
    note: "The SDK also records your Python version, operating system, architecture and git details by default, with credentials stripped from the remote URL. You can turn that off.",
  },
  {
    id: "api-keys",
    eyebrow: "API keys",
    title: "Stored as hashes, shown once.",
    body: "A key is sg_ followed by 64 random hexadecimal characters. The backend stores only a SHA-256 hash, so it cannot show a key again. Revoking one makes it stop working at once. The SDK never logs a key or puts it in an error, and the CLI has no option that would put one in your shell history.",
  },
  {
    id: "isolation",
    eyebrow: "Access",
    title: "Every record belongs to an owner.",
    body: "Each request is checked against the owner of what it asks for, along the chain from user to project to experiment to the record. A record you do not own looks the same as one that does not exist, so one user cannot discover another's ids.",
  },
  {
    id: "sessions",
    eyebrow: "Passwords and sessions",
    title: "Hashed passwords and a short-lived sign-in.",
    body: "Passwords are hashed with argon2. Signing in to the dashboard creates an API key that runs your browser session, held in a cookie that scripts on the page cannot read, and that is sent only over HTTPS in production. You can see and revoke those keys under Settings.",
  },
  {
    id: "limits",
    eyebrow: "Abuse limits",
    title: "Rate limits on keys, addresses and sign-in.",
    body: "Requests are limited per API key and per address, and sign-in and sign-up are limited more tightly.",
  },
  {
    id: "hosting",
    eyebrow: "Hosted or self-hosted",
    title: "Run it yourself if the records must stay with you.",
    body: `The code is open source under the ${PRODUCT.license} license. You can run the database, the backend and the dashboard in your own environment. The hosted backend is an alpha service.`,
    note: "The backend serves plain HTTP and adds no security headers of its own, so put it behind HTTPS and a proxy you control. In production it refuses to start with an unset or default JWT secret.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Plain about what it does and does not do."
        lede="This page describes how SynthGraph works today. It does not present certifications, audits or compliance claims, because there are none."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/docs/operate/security" arrow>
            Read the full security page
          </ButtonLink>
          <ButtonLink href="/docs/operate/self-hosting" variant="secondary">
            Self-hosting
          </ButtonLink>
        </div>
      </PageHero>

      <section className="border-t border-line">
        <div className="shell">
          <Reveal>
            <div className="rounded-lg border border-warn/25 bg-warn/[0.03] p-6">
              <p className="font-mono text-[10px] tracking-[0.16em] text-warn uppercase">What this page does not claim</p>
              <p className="mt-3 max-w-[76ch] text-[15px] leading-[1.7] text-ink-muted">
                SynthGraph has no SOC 2 or ISO 27001 certification and makes no claim of conformance with
                a regulation such as GDPR. It has no audit log and no hard delete through the API. If your
                institution needs a specific assurance, ask, and the answer will be plain.
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

      <section className="border-t border-line py-20">
        <div className="shell">
          <Reveal>
            <p className="mono-label">Report a vulnerability</p>
            <h2 className="mt-4 max-w-[24ch] text-[26px] leading-[1.15] font-medium tracking-[-0.02em] text-ink md:text-[32px]">
              Please do not open a public issue.
            </h2>
            <p className="mt-5 max-w-[66ch] text-[15.5px] leading-[1.7] text-ink-muted">
              Email {SITE.contactEmail} with what you found and its impact, the steps to reproduce it, and
              the component and version or commit. The maintainers will acknowledge it and work on a fix and
              a disclosure plan before details are published. No response time is promised. The full policy is{" "}
              <a href={`${SITE.github}/blob/main/SECURITY.md`} className="text-ink underline underline-offset-2">
                SECURITY.md
              </a>{" "}
              in the repository.
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
