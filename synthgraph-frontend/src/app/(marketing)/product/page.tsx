import type { Metadata } from "next";
import { LineageScene } from "@/components/3d/dynamic";
import { DashboardShowcase } from "@/components/sections/DashboardShowcase";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";
import { PRODUCT } from "@/data/product";

export const metadata: Metadata = {
  title: "Product",
  description:
    "What SynthGraph records and shows: generations, dataset and asset versions, training runs and metrics, evaluations, lineage, declared metric directions, reports, and a reproduction manifest.",
};

const available = <StatusBadge status="available" />;

const FEATURES: Feature[] = [
  {
    id: "generations",
    eyebrow: "Generations",
    title: "The run that produced the data, recorded as a run.",
    body: "A generation records the generator, its version, the seed and your parameters, and moves from pending to running to completed or failed. A failed generation is kept. The definition is written before the outcome is known, and it cannot be edited afterwards.",
    fields: [
      ["generator, generator_version", "what ran, e.g. blender 4.2"],
      ["seed", "the random seed, if the run has one"],
      ["parameters", "any JSON object, no schema imposed"],
      ["status", "pending, running, completed, failed"],
      ["environment", "Python, OS, git commit, branch, dirty flag"],
    ],
    note: "Environment details are recorded by default and can be turned off.",
    status: available,
  },
  {
    id: "data",
    eyebrow: "Datasets and assets",
    title: "Versions by reference, not by folder name.",
    body: "A dataset or an asset accumulates immutable versions. Each one is a URI, a label and optional details. SynthGraph never reads or stores the data. If you want proof the bytes are unchanged, ask the SDK to hash a local file or folder.",
    fields: [
      ["name, uri", "where it lives, stored as text and never opened"],
      ["version", "a label; the current UTC time if you give none"],
      ["format, size", "optional descriptions"],
      ["checksum", "yours, or computed for a local path on request"],
    ],
    status: available,
  },
  {
    id: "training",
    eyebrow: "Training runs",
    title: "The model, its configuration and its metrics.",
    body: "A training run records the model, the framework, your configuration and the data it used. You move it through its lifecycle and log metrics by step. Resource use can be sampled in the background, and the run reports how completely its telemetry was captured.",
    fields: [
      ["model, framework, config", "what was trained, and how"],
      ["log_metric(step, metrics)", "metrics by step"],
      ["monitor_resources()", "CPU, memory and GPU samples"],
      ["capture status", "complete, partial, or never reported"],
    ],
    status: available,
  },
  {
    id: "evaluations",
    eyebrow: "Evaluations",
    title: "A score is recorded with what it was measured on.",
    body: "An evaluation always names the dataset version it was scored on, and can record the checkpoint step. Scores on different datasets are different results, so the dashboard keeps them apart: the leaderboard ranks a run only against runs scored on the same evaluation set.",
    fields: [
      ["metrics", "names to values"],
      ["dataset_version_id", "required: what it was measured on"],
      ["checkpoint_step", "the step it was taken at, never read from a name"],
    ],
    status: available,
  },
  {
    id: "lineage",
    eyebrow: "Lineage",
    title: "Every line is a link someone recorded.",
    body: "Say which data a run used, or which generation, and the graph connects them. If you record nothing, it draws nothing and says so. A dataset belongs to the first project that references it, so one project's lineage cannot silently pull in another's.",
    fields: [
      ["training(dataset=, datasets=, generations=)", "link at creation"],
      ["use(), add_dataset()", "link afterwards"],
      ["link_generation()", "a run that used a generation but no dataset"],
    ],
    status: available,
  },
  {
    id: "directions",
    eyebrow: "Metric directions",
    title: "You declare what better means.",
    body: "Bigger is better for reward and worse for loss. You declare it once per experiment, and nothing is inferred from a metric's name. A different direction for a declared metric is rejected, and a correction needs a note. Without a declaration there is no verdict.",
    fields: [
      ["maximize, minimize, neutral", "the three values"],
      ["correction note", "required to change one on purpose"],
    ],
    status: available,
  },
  {
    id: "reports",
    eyebrow: "Reports",
    title: "Across experiments and projects.",
    body: "Capture completeness shows where telemetry has gaps. The efficiency leaderboard plots result against training time per evaluation set. Best runs lists the best value of each metric whose direction was declared. Training run search finds runs by a numeric condition on a parameter or a metric.",
    status: available,
  },
  {
    id: "reproduction",
    eyebrow: "Reproduction and documentation",
    title: "What you would need to rerun it, and what is missing.",
    body: "The reproduction manifest sorts what was recorded into known, supplied, outside SynthGraph and missing, and grades how completely a generation was recorded. The grade does not claim a rerun will match. A generated Markdown description is available too.",
    note: "It grades recording, not reproducibility.",
    status: available,
  },
  {
    id: "cli",
    eyebrow: "Command line",
    title: "Read it back from a terminal or a script.",
    body: "The synthgraph command lists and shows records, compares generations, searches experiments, and exports manifests and documentation. Every command can print JSON, and the exit codes tell a script what went wrong.",
    status: available,
  },
  {
    id: "open",
    eyebrow: "Open source",
    title: `Under the ${PRODUCT.license} license, and yours to run.`,
    body: "Run the database, the backend and the dashboard yourself, so your records live in your own Postgres. There is also a hosted backend, which is an alpha service.",
    status: available,
  },
];

export default function ProductPage() {
  return (
    <>
      <PageHero
        eyebrow="Product"
        title="A record of what produced every result."
        lede="SynthGraph holds a small number of record types and the links between them. Everything the product does, such as comparison, reports and the reproduction manifest, reads from those records."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/docs/quickstart" arrow>
            Get started
          </ButtonLink>
          <ButtonLink href="/docs/reference/limits" variant="secondary">
            What it does not do
          </ButtonLink>
        </div>
      </PageHero>

      <section className="border-t border-line py-16">
        <div className="shell">
          <LineageScene />
          <Disclaimer className="mt-6" />
        </div>
      </section>

      <section className="pb-8">
        <div className="shell">
          <FeatureList features={FEATURES} />
        </div>
      </section>

      <DashboardShowcase />
      <FinalCTA />
    </>
  );
}
