import type { Metadata } from "next";
import Image from "next/image";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ButtonLink } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SDK_INSTALL_COMMAND } from "@/data/product";
import { CONFIGURE_SNIPPET, RECORD_STEPS } from "@/data/snippets";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Six steps from install to a recorded lineage: configure the SDK, record a generation, its data, a training run and its evaluation, then read it back.",
};

type Step = {
  title: string;
  body: string;
  code?: string;
  language?: "python" | "bash";
  filename?: string;
  image?: { src: string; alt: string };
};

const STEPS: Step[] = [
  {
    title: "Install and configure",
    body: "The SDK is a Python package. Create an API key in the dashboard, then point the SDK at your backend with two environment variables. Nothing runs in the background, and nothing changes in how you generate or train.",
    code: `$ ${SDK_INSTALL_COMMAND}\n\n${CONFIGURE_SNIPPET}`,
    language: "bash",
    filename: "shell",
  },
  {
    title: "Record a generation",
    body: "Open a generation with its generator, version, seed and parameters, and run your pipeline inside it. The block starts the generation, completes it when your code finishes, and marks it failed if your code raises. A failed generation stays in the record.",
    code: RECORD_STEPS.generation,
    language: "python",
    filename: "capture.py",
  },
  {
    title: "Record the data it produced",
    body: "A dataset is recorded by reference: where it lives and what you call it. Nothing is uploaded. You can ask the SDK to hash a local folder if you want to be able to prove the bytes have not changed.",
    code: RECORD_STEPS.dataset,
    language: "python",
    filename: "capture.py",
  },
  {
    title: "Record the training run",
    body: "Create the run with the data it used, then start it. A training run moves through its own lifecycle, which you call. Passing the dataset when you create the run is what links the run to its data.",
    code: RECORD_STEPS.training,
    language: "python",
    filename: "capture.py",
  },
  {
    title: "Record what it scored",
    body: "Log metrics as the run goes, then record the evaluation. An evaluation always names the dataset version it was measured on. Complete the run when it ends.",
    code: RECORD_STEPS.evaluation,
    language: "python",
    filename: "capture.py",
  },
  {
    title: "Read it back",
    body: "Open the dashboard to see the lineage, the metrics and how completely each run was recorded, or use the command line to query and export it. Every line in the graph is a link you recorded.",
    image: {
      src: "/screens/lineage.webp",
      alt: "The lineage graph of a demo project: generations, dataset versions, training runs and evaluations joined by recorded links.",
    },
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Six steps, one record."
        lede="A provenance record is built up in the order the research happens. These are the steps of the quickstart, with the code that records each one."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/docs/quickstart" arrow>
            Open the quickstart
          </ButtonLink>
          <ButtonLink href="/docs" variant="secondary">
            Read the docs
          </ButtonLink>
        </div>
      </PageHero>

      <section className="border-t border-line">
        <div className="shell">
          <ol className="flex flex-col">
            {STEPS.map((step, index) => (
              <Reveal as="li" key={step.title}>
                <article className="grid gap-8 border-b border-line py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                      <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink md:text-[26px]">{step.title}</h2>
                    </div>
                    <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.68] text-ink-muted">{step.body}</p>
                  </div>
                  {step.code ? (
                    <CodeBlock code={step.code} language={step.language ?? "python"} filename={step.filename} />
                  ) : step.image ? (
                    <div>
                      <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl">
                        <Image src={step.image.src} alt={step.image.alt} width={1800} height={1126} className="h-auto w-full" />
                      </div>
                      <p className="mt-3 font-mono text-[11px] text-ink-faint">
                        Demo data: an invented adverse-weather detection project.
                      </p>
                    </div>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
