import type { Metadata } from "next";
import { DatasetVersionScene } from "@/components/3d/dynamic";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Researchers } from "@/components/sections/Researchers";
import { ButtonLink } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "For Researchers",
  description:
    "Reproducibility, scientific lineage, experiment comparison, dataset and asset versions, and lab knowledge preservation for computer-vision research groups.",
};

const FEATURES: Feature[] = [
  {
    id: "reproducibility",
    eyebrow: "Reproducibility",
    title: "Make every experiment explainable after it runs.",
    body: "Reproducibility fails in a specific way: the configuration existed, and then it stopped existing. A parameter lived in a notebook cell that was re-run, a seed was never printed, an asset was overwritten. SynthGraph writes those things down at the moment they are still true.",
    note: "Recording provenance does not make an experiment reproducible on its own. It makes the gap between what you have and what you would need explicit — which is the part that is usually invisible.",
  },
  {
    id: "scientific-lineage",
    eyebrow: "Scientific lineage",
    title: "A result is only as legible as its chain.",
    body: "An evaluation number in a paper table stands on a training run, which stands on dataset versions, which stand on a generation with parameters, assets and a seed. Lineage keeps that chain intact so a result can be defended, questioned or revisited.",
  },
  {
    id: "comparison",
    eyebrow: "Experiment comparison",
    title: "Compare runs on what actually differed.",
    body: "Two sweeps that look identical in a folder listing may differ in one parameter and one dataset version. Comparison aligns their recorded fields so the difference is visible instead of remembered.",
  },
  {
    id: "dataset-versions",
    eyebrow: "Dataset versions",
    title: "The dataset you trained on, not the one that exists now.",
    body: "Datasets are regenerated, filtered and extended over the life of a project. Recording the DatasetVersion a run consumed keeps months-old results meaningful after the dataset has moved on.",
  },
  {
    id: "asset-versions",
    eyebrow: "Asset versions",
    title: "Scene content is part of the experiment.",
    body: "In synthetic data the assets are inputs. A generation that referenced vehicle-model:v2 is a different experiment from one that referenced v7, even when every other parameter matches.",
  },
  {
    id: "documentation",
    eyebrow: "Documentation",
    title: "Material for a reproducibility supplement.",
    body: "A reproduction manifest collects the recorded configuration, references and known gaps in one place — the same information a supplement, an appendix or a reviewer’s question tends to ask for.",
  },
  {
    id: "lab-knowledge",
    eyebrow: "Lab knowledge preservation",
    title: "Experiments outlive the people who ran them.",
    body: "Students graduate, postdocs move on, machines are reimaged. A lab that records provenance keeps the reasoning behind its experiments after the person who held it in their head has left.",
  },
];

export default function ResearchPage() {
  return (
    <>
      <PageHero
        eyebrow="For researchers"
        title="Make every experiment explainable after it runs."
        lede="SynthGraph is built for computer-vision research groups working with synthetic data — where the configuration that produced a dataset is often the most fragile part of the whole pipeline."
      >
        <ButtonLink href="/demo" arrow>
          Request a Research Demo
        </ButtonLink>
      </PageHero>

      <section className="border-t border-line py-16">
        <div className="shell">
          <DatasetVersionScene />
          <Disclaimer className="mt-6" />
        </div>
      </section>

      <section className="pb-8">
        <div className="shell">
          <FeatureList features={FEATURES} />
        </div>
      </section>

      <Researchers />
      <FinalCTA />
    </>
  );
}
