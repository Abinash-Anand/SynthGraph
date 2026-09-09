import { ConvergenceScene } from "@/components/3d/dynamic";
import { StatusBadge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const ROADMAP = [
  {
    version: "v1.0",
    title: "Manual capture",
    body: "The SDK is called explicitly from your own generation and training code.",
    status: "private-pilot" as const,
  },
  {
    version: "v1.1",
    title: "Tool integrations",
    body: "Thinner wrappers for common generators and training frameworks.",
    status: "planned" as const,
  },
  {
    version: "v1.2",
    title: "Automatic instrumentation",
    body: "Capture that requires little or no explicit instrumentation in the research code.",
    status: "roadmap" as const,
  },
];

export function PlatformIndependence() {
  return (
    <Section id="platform">
      <div className="shell">
        <SectionHeader
          eyebrow="Platform independence"
          title="One provenance model. Many research environments."
          lede="A generation from Blender, a generation from a custom C++ simulator and a generation from a Python script produce the same kind of record. That is what makes them comparable years later."
        />
      </div>

      <div className="mt-12">
        <div className="shell">
          <ConvergenceScene />
        </div>
      </div>

      <div className="shell mt-10 border-t border-line pt-10">
        <p className="mono-label">Roadmap</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {ROADMAP.map((stage, index) => (
            <Reveal as="li" key={stage.version} delay={index * 0.07}>
              <div className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12.5px] text-cyan">{stage.version}</span>
                  <StatusBadge status={stage.status} />
                </div>
                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">
                  {stage.title}
                </h3>
                <p className="text-[14.5px] leading-[1.62] text-ink-muted">{stage.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <p className="mt-6 font-mono text-[11px] leading-[1.7] text-ink-faint">
          Items marked planned or roadmap are not available today.
        </p>
      </div>
    </Section>
  );
}
