import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const DEPLOYMENTS = [
  {
    title: "Cloud deployment",
    body: "A hosted API, so a lab can start recording provenance without operating a service.",
    points: ["Managed API", "No infrastructure to run", "Shared across a group"],
  },
  {
    title: "Self-controlled deployment",
    body: "The same provenance model, deployed where the institution’s requirements say it has to live.",
    points: ["Runs in your environment", "Data stays inside your boundary", "Same SDK, different endpoint"],
  },
];

export function CloudLocal() {
  return (
    <Section id="deployment">
      <div className="shell">
        <SectionHeader
          eyebrow="Deployment"
          title="Cloud when you need it. Control when you need it."
          lede="SynthGraph is designed to support cloud-hosted and local/self-controlled deployments while preserving the same core provenance concepts."
        />

        <div className="mt-12">
          <div className="rounded-lg border border-line bg-surface/50 p-5 text-center">
            <p className="font-mono text-[13px] text-ink">SynthGraph SDK</p>
            <p className="mt-1 font-mono text-[11px] text-ink-dim">
              one client, one configurable endpoint
            </p>
          </div>

          <div className="flex justify-center py-3" aria-hidden>
            <span className="block h-6 w-px bg-cyan/40" />
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {DEPLOYMENTS.map((deployment, index) => (
              <Reveal as="li" key={deployment.title} delay={index * 0.08} className="flex">
                <div className="flex w-full flex-col gap-3 rounded-lg border border-line bg-surface/50 p-6">
                  <h3 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
                    {deployment.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.65] text-ink-muted">{deployment.body}</p>
                  <ul className="mt-2 flex flex-col gap-1.5 border-t border-line pt-4">
                    {deployment.points.map((point) => (
                      <li key={point} className="font-mono text-[12px] text-ink-dim">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ul>

          <p className="mt-8 max-w-[70ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
            Deployment targets are described in terms of where the service runs, not in terms of a
            specific cloud provider. That choice is not finalised.
          </p>
        </div>
      </div>
    </Section>
  );
}
