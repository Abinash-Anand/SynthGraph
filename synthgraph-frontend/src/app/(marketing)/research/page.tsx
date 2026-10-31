import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ButtonLink } from "@/components/ui/Button";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "Two ways researchers use SynthGraph: synthetic images for detection, and domain-randomized reinforcement learning. What each records, and the questions it answers later.",
};

const FEATURES: Feature[] = [
  {
    id: "detection",
    eyebrow: "Synthetic images for detection",
    title: "Which rendering settings helped, and on which conditions?",
    body: "Render scenes with different weather and visibility settings, train a detector on each, and score every model on test sets for each condition. SynthGraph records the render settings and seed, the dataset versions, the runs and the scores, so the question is answerable weeks later: did heavier rain in training help on heavy-rain test images, and what did it cost on clear ones?",
    fields: [
      ["generation", "generator, seed, rain intensity, visibility"],
      ["dataset versions", "one per training set and one per test condition"],
      ["training runs", "model, configuration, the data each used"],
      ["evaluations", "mAP per test set, at checkpoints"],
    ],
    note: "Give each test condition its own dataset version. The leaderboard ranks a run only against runs scored on the same one, so a clear-weather score and a heavy-rain score are never blended.",
  },
  {
    id: "reinforcement-learning",
    eyebrow: "Domain-randomized reinforcement learning",
    title: "Which randomization ranges produced a policy that held up?",
    body: "Train a policy in simulation with wider or narrower randomization of friction, mass or gains, and evaluate it on held-out terrains. Helpers read the randomization configuration from MuJoCo Playground or Isaac Lab, and the stable-baselines3 and skrl helpers log training metrics for you. A run that used a randomization setup but no dataset is linked to its generation directly.",
    fields: [
      ["generation", "the randomization ranges and seed"],
      ["link_generation()", "ties the policy run to the setup it used"],
      ["metric directions", "reward maximize, fall rate minimize"],
      ["evaluations", "reward and fall rate at checkpoint steps"],
    ],
    note: "An evaluation needs a dataset version to name what it was measured on. For a simulator evaluation, record a reference that stands for the evaluation setup.",
  },
  {
    id: "lab-record",
    eyebrow: "A lab record",
    title: "Something to hand over, or to attach to a paper.",
    body: "Export a reproduction manifest and generated Markdown documentation for a generation, from the dashboard or the command line. They list what you would need to rerun it, which inputs live outside SynthGraph, and what was never recorded.",
    note: "The manifest grades how completely a run was recorded. Recording provenance does not make an experiment reproducible on its own. It makes the gap between what you have and what you would need explicit.",
  },
];

const QUESTIONS = [
  "Which seed and parameters produced this dataset?",
  "Which dataset version did this model train on?",
  "Which generator and code version was that, and was the working tree clean?",
  "Did the runs that scored best use the same evaluation set?",
  "Which generations failed, and with what settings?",
  "Where is my telemetry incomplete?",
  "What would I need to rerun this, and what is missing?",
];

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        eyebrow="Use cases"
        title="For work where the data is generated."
        lede="SynthGraph is for researchers who produce their training data with a generator or a simulator, whether that is rendered images or randomized physics. You keep your tools and your data. It keeps the record of what produced what."
      >
        <ButtonLink href="/docs/quickstart" arrow>
          Get started
        </ButtonLink>
      </PageHero>

      <section className="border-t border-line pb-8">
        <div className="shell">
          <FeatureList features={FEATURES} />
        </div>
      </section>

      <section className="border-t border-line py-20">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="mono-label">Questions it answers later</p>
            <h2 className="mt-4 max-w-[20ch] text-[26px] leading-[1.15] font-medium tracking-[-0.02em] text-ink md:text-[32px]">
              The ones you will be asked months from now.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="flex flex-col gap-3">
              {QUESTIONS.map((question) => (
                <li key={question} className="flex gap-3">
                  <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-cyan" />
                  <span className="text-[15.5px] leading-[1.62] text-ink-muted">{question}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
