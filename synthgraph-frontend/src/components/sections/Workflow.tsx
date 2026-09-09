import { CodeBlock } from "@/components/ui/CodeBlock";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

const SDK_SNIPPET = `from synthgraph import SynthGraphClient, Generator, Reproducibility

client = SynthGraphClient(
    api_key="...",
)

generation = client.generations.create(
    experiment_id="experiment_123",
    name="Rainy Scene Generation",
    generator=Generator(
        name="blender",
        version="4.2.0",
    ),
    parameters={
        "weather": "rain",
        "occlusion": 0.30,
        "camera_distance": 12,
    },
    reproducibility=Reproducibility(
        seed=42,
    ),
)`;

const TOOLS = [
  ["Blender", "generator"],
  ["Unity", "generator"],
  ["Omniverse", "generator"],
  ["Custom Python", "generator"],
  ["PyTorch", "training"],
  ["W&B", "tracking"],
  ["Git", "code version"],
  ["Storage", "datasets"],
];

const PIPELINE = [
  { label: "Python process", detail: "your script, notebook or job" },
  { label: "SynthGraph SDK", detail: "typed models, retries, idempotency" },
  { label: "HTTPS / JSON", detail: "authenticated request" },
  { label: "SynthGraph API", detail: "server-side validation" },
  { label: "Provenance storage", detail: "records, versions, relationships" },
];

export function Workflow() {
  return (
    <Section id="workflow">
      <div className="shell">
        <SectionHeader
          eyebrow="Integration"
          title="Keep your workflow. Add provenance."
          lede="SynthGraph does not ask researchers to move their work into another platform. The Python SDK sits inside the workflow they already have."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal className="min-w-0">
            <div className="flex flex-col gap-6">
              <div>
                <p className="mono-label">Tools you keep</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {TOOLS.map(([name, role]) => (
                    <li
                      key={name}
                      className={cn(
                        "group flex items-baseline gap-2 rounded-md border border-line",
                        "bg-surface/60 px-3 py-2 transition-colors duration-300 hover:border-line-strong",
                      )}
                    >
                      <span className="text-[13.5px] text-ink">{name}</span>
                      <span className="font-mono text-[10px] text-ink-faint">{role}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mono-label">What the call becomes</p>
                <ol className="mt-4 flex flex-col">
                  {PIPELINE.map((step, index) => (
                    <li key={step.label}>
                      <div className="flex items-baseline gap-3 rounded-md border border-line bg-surface/50 px-4 py-3">
                        <span className="font-mono text-[11px] text-ink-faint">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="block font-mono text-[13.5px] text-ink">
                            {step.label}
                          </span>
                          <span className="block font-mono text-[11px] text-ink-dim">
                            {step.detail}
                          </span>
                        </span>
                      </div>
                      {index < PIPELINE.length - 1 ? (
                        <div className="py-1.5 pl-8">
                          <span aria-hidden className="block h-3 w-px bg-cyan/40" />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
              <CodeBlock
                code={SDK_SNIPPET}
                language="python"
                filename="sweep.py"
                animate
              />
              <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.65] text-ink-muted">
                The generator still runs where it always ran. What changes is that the
                parameters, the seed and the generator version are now written down next to
                the result they produced.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
