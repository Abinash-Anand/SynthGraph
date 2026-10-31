/**
 * ILLUSTRATIVE DEMO DATA
 *
 * Everything in this file is fabricated for the purpose of explaining the
 * SynthGraph data model on the marketing site. None of it represents a real
 * customer, a real experiment, or a benchmark result. It is referenced by the
 * 3D scenes, the search mock and the dashboard preview so that a single edit
 * stays consistent everywhere.
 */

export const DEMO_DISCLAIMER =
  "Illustrative data. Shown to explain the provenance model, not a benchmark or customer result.";

export type NodeKind =
  | "generation"
  | "dataset"
  | "datasetVersion"
  | "asset"
  | "assetVersion"
  | "training"
  | "evaluation"
  | "code"
  | "environment"
  | "parameters";

export const NODE_COLOR: Record<NodeKind, string> = {
  generation: "#37c9de",
  dataset: "#5b8dfb",
  datasetVersion: "#5b8dfb",
  asset: "#a78bfa",
  assetVersion: "#a78bfa",
  training: "#d9a441",
  evaluation: "#46b97e",
  code: "#7f8ea8",
  environment: "#7f8ea8",
  parameters: "#37c9de",
};

export const demoGeneration = {
  id: "GEN-004821",
  name: "Rainy Scene Generation",
  generator: "Blender",
  version: "4.2.0",
  seed: 42,
  status: "completed" as const,
  parameters: {
    weather: "rain",
    occlusion: 0.3,
    cameraDistance: 12,
  },
};

export const demoDataset = {
  id: "DATASET-00912",
  name: "rain_dataset",
  version: "v7",
  format: "image",
  uri: "s3://research/rain-v7",
  frames: 24_000,
  size: "412 GB",
};

export const demoTraining = {
  id: "RUN-01337",
  model: "YOLO",
  framework: "PyTorch",
  epochs: 50,
  status: "completed" as const,
};

export const demoEvaluation = {
  id: "EVAL-00551",
  mAP: 0.724,
  precision: 0.78,
  recall: 0.69,
};

export const demoCode = {
  commit: "8f3a2b1",
  branch: "rain-sweep",
  dirty: false,
};

export const demoAssets = [
  { name: "vehicle-model", versions: ["v1", "v2", "v7"], used: "v7" },
  { name: "forest-texture", versions: ["v1", "v4"], used: "v4" },
] as const;

/* ------------------------------------------------------------------ */
/* Inspector payloads used by the 3D graphs                            */
/* ------------------------------------------------------------------ */

export type InspectorField = { label: string; value: string };

export type LineageNode = {
  id: string;
  kind: NodeKind;
  /** Short label rendered in-scene. */
  title: string;
  /** Two supporting lines rendered under the title in-scene. */
  lines: [string, string];
  /** Deterministic position. No physics, no randomness at runtime. */
  position: [number, number, number];
  /**
   * Narrow-screen position. The chain is stacked vertically rather than the
   * desktop layout being shrunk — a scaled-down wide graph is unreadable on a
   * phone, and the causal order is what has to survive.
   */
  compact: [number, number, number];
  inspector: { heading: string; ref: string; fields: InspectorField[] };
};

export const LINEAGE_NODES: LineageNode[] = [
  {
    id: "generation",
    kind: "generation",
    title: "GENERATION",
    lines: ["Blender 4.2", "seed 42"],
    position: [-5.4, 1.1, 0],
    compact: [0, 3.6, 0],
    inspector: {
      heading: "Generation run",
      ref: demoGeneration.id,
      fields: [
        { label: "Generator", value: "Blender 4.2.0" },
        { label: "Seed", value: "42" },
        { label: "weather", value: "rain" },
        { label: "occlusion", value: "0.30" },
        { label: "camera_distance", value: "12" },
      ],
    },
  },
  {
    id: "dataset",
    kind: "datasetVersion",
    title: "DATASET",
    lines: ["rain_dataset:v7", "24,000 frames"],
    position: [-1.8, -0.7, 0.4],
    compact: [0, 1.45, 0],
    inspector: {
      heading: "Dataset version",
      ref: demoDataset.id,
      fields: [
        { label: "Logical dataset", value: "rain_dataset" },
        { label: "Version", value: "v7" },
        { label: "Format", value: "image" },
        { label: "Reference", value: "s3://research/rain-v7" },
        { label: "Stored by", value: "researcher" },
      ],
    },
  },
  {
    id: "training",
    kind: "training",
    title: "TRAINING",
    lines: ["YOLO", "50 epochs"],
    position: [1.9, 0.9, -0.3],
    compact: [0, -0.7, 0],
    inspector: {
      heading: "Training run",
      ref: demoTraining.id,
      fields: [
        { label: "Model", value: "YOLO" },
        { label: "Framework", value: "PyTorch" },
        { label: "Epochs", value: "50" },
        { label: "Input", value: "rain_dataset:v7" },
        { label: "Status", value: "completed" },
      ],
    },
  },
  {
    id: "evaluation",
    kind: "evaluation",
    title: "EVALUATION",
    lines: ["mAP 0.724", "precision 0.78"],
    position: [5.3, -0.5, 0.2],
    compact: [0, -2.85, 0],
    inspector: {
      heading: "Evaluation result",
      ref: demoEvaluation.id,
      fields: [
        { label: "mAP", value: "0.724" },
        { label: "Precision", value: "0.78" },
        { label: "Recall", value: "0.69" },
        { label: "Training run", value: "RUN-01337" },
      ],
    },
  },
  {
    id: "assets",
    kind: "assetVersion",
    title: "ASSETS",
    lines: ["vehicle-model:v7", "forest-texture:v4"],
    position: [-6.1, -2.2, -1.4],
    compact: [1.9, 5.75, 0],
    inspector: {
      heading: "Asset versions",
      ref: "ASSET-0231 / ASSET-0114",
      fields: [
        { label: "vehicle-model", value: "v7" },
        { label: "forest-texture", value: "v4" },
        { label: "Referenced by", value: "GEN-004821" },
      ],
    },
  },
  {
    id: "code",
    kind: "code",
    title: "CODE",
    lines: ["commit 8f3a2b1", "branch rain-sweep"],
    position: [-3.0, 3.0, -1.1],
    compact: [-1.9, 5.75, 0],
    inspector: {
      heading: "Code version",
      ref: "8f3a2b1",
      fields: [
        { label: "Commit", value: "8f3a2b1" },
        { label: "Branch", value: "rain-sweep" },
        { label: "Working tree", value: "clean" },
      ],
    },
  },
  {
    id: "environment",
    kind: "environment",
    title: "ENVIRONMENT",
    lines: ["python 3.11", "recorded, not captured"],
    position: [0.6, 3.1, -1.6],
    compact: [2.4, 0.3, 0],
    inspector: {
      heading: "Environment metadata",
      ref: "ENV-0097",
      fields: [
        { label: "Python", value: "3.11.8" },
        { label: "Platform", value: "linux-x86_64" },
        { label: "Note", value: "selected metadata only" },
      ],
    },
  },
];

/** Directed provenance edges between LINEAGE_NODES ids. */
export const LINEAGE_EDGES: Array<{ from: string; to: string; primary?: boolean }> = [
  { from: "code", to: "generation" },
  { from: "assets", to: "generation" },
  { from: "generation", to: "dataset", primary: true },
  { from: "dataset", to: "training", primary: true },
  { from: "environment", to: "training" },
  { from: "training", to: "evaluation", primary: true },
];

/* ------------------------------------------------------------------ */
/* Search / comparison / dashboard mocks                               */
/* ------------------------------------------------------------------ */
