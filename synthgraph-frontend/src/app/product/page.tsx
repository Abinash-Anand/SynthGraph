import type { Metadata } from "next";
import { LineageScene } from "@/components/3d/dynamic";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FeatureList, type Feature } from "@/components/ui/FeatureBlock";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Generation provenance, dataset and asset versioning, training and evaluation lineage, search, comparison, reproduction manifests and storage references.",
};

const FEATURES: Feature[] = [
  {
    id: "generation-provenance",
    eyebrow: "Generation provenance",
    title: "The run that produced the data, recorded as a run.",
    body: "A Generation is a first-class record. It names the generator and its version, the parameters it was given, the seed it used, the asset versions it referenced and the code version it ran under. It exists from the moment the run starts, not after it succeeds.",
    fields: [
      ["generator.name", "e.g. blender"],
      ["generator.version", "e.g. 4.2.0"],
      ["parameters", "the arguments the run was given"],
      ["reproducibility.seed", "the seed used"],
      ["status", "pending, running, completed, failed"],
      ["experiment_id", "the experiment it belongs to"],
    ],
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "dataset-versioning",
    eyebrow: "Dataset versioning",
    title: "DatasetVersion, not a folder name.",
    body: "A logical dataset accumulates versions. Every generation, training run and evaluation refers to a specific DatasetVersion, so a record still means something after the dataset has grown, been filtered, or been regenerated.",
    fields: [
      ["dataset", "the logical dataset"],
      ["version", "the specific version referenced"],
      ["uri", "where the data actually lives"],
      ["checksum", "content identity, where available"],
      ["format", "image, video, annotation set"],
      ["created_by", "the generation that produced it"],
    ],
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "asset-versioning",
    eyebrow: "Asset versioning",
    title: "Scene assets are versioned inputs too.",
    body: "A generation can reference exact AssetVersions rather than an asset name. Replacing a model or a texture on disk no longer silently changes the meaning of every run that used it.",
    fields: [
      ["asset", "the logical asset"],
      ["version", "the version referenced"],
      ["referenced_by", "the generations that used it"],
    ],
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "training-lineage",
    eyebrow: "Training lineage",
    title: "A model is downstream of specific data.",
    body: "A TrainingRun records its configuration and the exact DatasetVersions it consumed. That single link is what turns a pile of checkpoints into a history you can reason about.",
    fields: [
      ["framework", "e.g. PyTorch"],
      ["model", "e.g. YOLO"],
      ["config", "hyperparameters and training setup"],
      ["inputs", "the DatasetVersions consumed"],
    ],
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "evaluation-lineage",
    eyebrow: "Evaluation lineage",
    title: "Metrics keep their chain of custody.",
    body: "An EvaluationResult belongs to a TrainingRun and, through it, to the dataset versions, the generation and the parameters upstream. A number in a table can always be traced back to the run that produced it.",
    fields: [
      ["metrics", "e.g. mAP, precision, recall"],
      ["training_run_id", "the run evaluated"],
      ["dataset_version", "what it was evaluated against"],
    ],
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "search",
    eyebrow: "Search",
    title: "Query the experiment history, not the filesystem.",
    body: "Experiments are searchable by project, generator, time and recorded metadata — including the parameters on the generation itself.",
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "comparison",
    eyebrow: "Comparison",
    title: "Field-by-field differences between two experiments.",
    body: "Two experiments aligned on their recorded fields, with the differences marked. It shows what changed; it does not claim to show why the result changed.",
    note: "Comparison is an inspection tool. Attributing a result to a parameter remains a research judgement, and SynthGraph does not make it for you.",
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "reproduction",
    eyebrow: "Reproduction",
    title: "A manifest that includes what is missing.",
    body: "The reproduction manifest gathers the recorded configuration, seeds, asset versions, dataset references and code version, and lists the dependencies that were external or unrecorded.",
    note: "SynthGraph makes dependencies and known provenance explicit. It does not guarantee exact reproduction when external dependencies were not captured.",
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "storage-references",
    eyebrow: "Storage references",
    title: "References to data, not copies of it.",
    body: "Datasets are referenced by URI and, where available, by checksum. Large generated data can stay on the researcher’s filesystem, lab storage or object storage; SynthGraph stores the pointer and the provenance around it.",
    status: <StatusBadge status="private-pilot" />,
  },
  {
    id: "documentation",
    eyebrow: "Documentation",
    title: "Reference documentation for the SDK and the data model.",
    body: "Written documentation covering the client, the record types and the lifecycle rules is being produced alongside the SDK during the pilot.",
    status: <StatusBadge status="planned" />,
  },
];

export default function ProductPage() {
  return (
    <>
      <PageHero
        eyebrow="Product"
        title="A record of what produced every result."
        lede="SynthGraph holds a small number of record types and the relationships between them. Everything the product does — search, comparison, reproduction — reads from those records."
      >
        <ButtonLink href="/demo" arrow>
          Request a Demo
        </ButtonLink>
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

      <ProductPreview />
      <FinalCTA />
    </>
  );
}
