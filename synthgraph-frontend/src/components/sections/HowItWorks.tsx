import { ButtonLink } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { SDK_INSTALL_COMMAND } from "@/data/product";
import { CONFIGURE_SNIPPET, RECORD_SNIPPET } from "@/data/snippets";

const STEPS = [
  {
    title: "Record",
    body: "Open a generation with its generator, seed and parameters. Record the dataset by reference. Then the training run, and what it scored. The with block marks the generation failed if your code raises, and keeps it.",
  },
  {
    title: "Link",
    body: "Say which data a run used. The links are the ones you record: nothing is inferred from timestamps, so every line in the graph is something you said.",
  },
  {
    title: "Inspect",
    body: "Open the dashboard or use the command line. See the lineage, the metrics, how completely each run was recorded, and what would be missing if you wanted to rerun it.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="shell">
        <SectionHeader
          eyebrow="How it works"
          title="A few calls around the code you already run."
          lede="No agent and no engine plugin. Your script calls a Python SDK, which sends records to the API over HTTPS. The backend stores them and the dashboard shows them."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal className="min-w-0">
            <ol className="flex flex-col gap-7">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-mono text-[11px] text-ink-faint">0{index + 1}</span>
                  <span>
                    <h3 className="font-mono text-[14px] text-ink">{step.title}</h3>
                    <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-[1.65] text-ink-muted">{step.body}</p>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col gap-4">
              <p className="mono-label">Install and configure</p>
              <CodeBlock code={`$ ${SDK_INSTALL_COMMAND}`} language="bash" filename="shell" />
              <CodeBlock code={CONFIGURE_SNIPPET} language="bash" filename="shell" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/docs/quickstart" arrow>
                Quickstart
              </ButtonLink>
              <ButtonLink href="/docs/sdk/generations" variant="secondary">
                SDK guides
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)]">
              <CodeBlock code={RECORD_SNIPPET} language="python" filename="capture.py" animate />
              <p className="mt-4 max-w-[56ch] text-[14.5px] leading-[1.65] text-ink-muted">
                Your generator still runs where it always ran. What changes is that its parameters, seed
                and version are written down next to the result they produced.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
