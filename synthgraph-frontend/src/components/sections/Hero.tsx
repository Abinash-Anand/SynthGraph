import { HeroGraphScene } from "@/components/3d/dynamic";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { DEMO_DISCLAIMER } from "@/data/demo-data";

const CHAIN = [
  { label: "Generation", detail: "generator, version, seed, parameters" },
  { label: "Dataset version", detail: "a reference, not an upload" },
  { label: "Training run", detail: "model, configuration, the data it used" },
  { label: "Evaluation", detail: "scores, tied to what they were measured on" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[calc(var(--nav-h)+56px)] pb-20 md:pt-[calc(var(--nav-h)+72px)]">
      <div className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[720px]" aria-hidden />

      <div className="shell relative">
        <Reveal>
          <Badge tone="cyan" dot>
            Open source · SDK 0.6 alpha
          </Badge>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-7 max-w-[15ch] text-[44px] leading-[0.98] font-medium tracking-[-0.035em] text-gradient-ink sm:text-[62px] lg:max-w-[1000px] lg:text-[86px] xl:text-[96px]">
            Know exactly what produced your model.
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-7 max-w-[68ch] text-[17px] leading-[1.62] text-ink-muted md:text-[20px]">
            SynthGraph records where your synthetic training data came from and what it
            trained: the generator, seed and parameters, the dataset versions, the training
            runs and their evaluations, linked into one graph you can inspect months later.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/docs/quickstart" size="lg" arrow>
              Get started
            </ButtonLink>
            <ButtonLink href="/docs" size="lg" variant="secondary">
              Read the docs
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-6 font-mono text-[12px] leading-[1.7] text-ink-dim">
            For researchers who generate synthetic data, from rendered images to randomized
            simulation. You keep your tools, and your data stays where it is.
          </p>
        </Reveal>
      </div>

      <div className="shell relative mt-10 lg:mt-4">
        <HeroGraphScene />

        {/* The graph is never the only carrier of this information. */}
        <div className="mt-6 border-t border-line pt-6">
          <ol className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHAIN.map((item, index) => (
              <li key={item.label} className="flex gap-3">
                <span className="font-mono text-[11px] text-ink-faint">0{index + 1}</span>
                <span>
                  <span className="block text-[14px] text-ink">{item.label}</span>
                  <span className="block text-[13px] leading-[1.55] text-ink-dim">
                    {item.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 font-mono text-[11px] text-ink-faint">{DEMO_DISCLAIMER}</p>
        </div>
      </div>
    </section>
  );
}
