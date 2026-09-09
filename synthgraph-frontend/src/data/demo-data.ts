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

export const NODE_LABEL: Record<NodeKind, string> = {
  generation: "Generation",
  dataset: "Dataset",
  datasetVersion: "Dataset version",
  asset: "Asset",
  assetVersion: "Asset version",
  training: "Training run",
  evaluation: "Evaluation result",
  code: "Code version",
  environment: "Environment",
  parameters: "Parameters",
};

/* ------------------------------------------------------------------ */
/* Core records                                                        */
/* ------------------------------------------------------------------ */

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

export type SearchResult = {
  id: string;
  name: string;
  generator: string;
  seed: number;
  occlusion: number;
  dataset: string;
  mAP: number;
  matched: boolean;
};

export const SEARCH_FILTERS = [
  { key: "generator", op: ":", value: "blender" },
  { key: "weather", op: ":", value: "rain" },
  { key: "occlusion", op: " > ", value: "0.30" },
] as const;

export const SEARCH_RESULTS: SearchResult[] = [
  {
    id: "EXP-00142",
    name: "Rainy Wildlife Detection",
    generator: "Blender 4.2",
    seed: 42,
    occlusion: 0.32,
    dataset: "rain_dataset:v7",
    mAP: 0.724,
    matched: true,
  },
  {
    id: "EXP-00131",
    name: "Rainy Wildlife Detection",
    generator: "Blender 4.2",
    seed: 7,
    occlusion: 0.45,
    dataset: "rain_dataset:v8",
    mAP: 0.748,
    matched: true,
  },
  {
    id: "EXP-00118",
    name: "Rainy Wildlife Detection",
    generator: "Blender 4.1",
    seed: 19,
    occlusion: 0.27,
    dataset: "rain_dataset:v5",
    mAP: 0.691,
    matched: false,
  },
  {
    id: "EXP-00097",
    name: "Clear Wildlife Detection",
    generator: "Blender 4.1",
    seed: 3,
    occlusion: 0.31,
    dataset: "clear_dataset:v2",
    mAP: 0.802,
    matched: false,
  },
];

export type ComparisonRow = {
  parameter: string;
  a: string;
  b: string;
  differs: boolean;
  metric?: boolean;
};

export const COMPARISON_ROWS: ComparisonRow[] = [
  { parameter: "Generator", a: "Blender 4.2", b: "Blender 4.2", differs: false },
  { parameter: "Seed", a: "42", b: "42", differs: false },
  { parameter: "Weather", a: "rain", b: "rain", differs: false },
  { parameter: "Occlusion", a: "0.30", b: "0.45", differs: true },
  { parameter: "Camera distance", a: "12", b: "12", differs: false },
  { parameter: "Dataset", a: "rain_dataset:v7", b: "rain_dataset:v8", differs: true },
  { parameter: "Asset: vehicle-model", a: "v7", b: "v7", differs: false },
  { parameter: "Epochs", a: "50", b: "50", differs: false },
  { parameter: "mAP", a: "0.724", b: "0.748", differs: true, metric: true },
];

export const REPRODUCTION_MANIFEST = `{
  "generation": {
    "generator": "blender",
    "version": "4.2.0",
    "seed": 42,
    "parameters": {
      "weather": "rain",
      "occlusion": 0.30,
      "camera_distance": 12
    }
  },
  "assets": [
    { "name": "vehicle-model", "version": "v7" },
    { "name": "forest-texture", "version": "v4" }
  ],
  "dataset": {
    "version": "v7",
    "uri": "s3://research/rain-v7",
    "checksum": "sha256:9c1f…e40b"
  },
  "code": {
    "commit": "8f3a2b1",
    "branch": "rain-sweep"
  },
  "missing": [
    "external CUDA environment",
    "GPU driver version"
  ]
}`;

export const DASHBOARD = {
  projects: [
    { name: "Wildlife Detection", experiments: 24, active: true },
    { name: "Autonomous Driving", experiments: 11, active: false },
    { name: "Synthetic Inspection", experiments: 6, active: false },
  ],
  experiments: [
    {
      name: "Rainy Scene Generation",
      generator: "Blender 4.2",
      dataset: "rain_dataset:v7",
      mAP: 0.724,
      status: "completed" as const,
    },
    {
      name: "Night Scene Generation",
      generator: "Blender 4.2",
      dataset: "rain_dataset:v4",
      mAP: 0.701,
      status: "completed" as const,
    },
    {
      name: "Fog Sweep 03",
      generator: "Blender 4.2",
      dataset: "fog_dataset:v2",
      mAP: null,
      status: "running" as const,
    },
    {
      name: "Occlusion Sweep 11",
      generator: "Blender 4.1",
      dataset: "rain_dataset:v5",
      mAP: null,
      status: "failed" as const,
    },
  ],
};

/** Points for the parameter-space visual. Deterministic, hand-placed. */
export const PARAMETER_POINTS = [
  { id: "EXP-00142", occlusion: 0.3, camera: 12, lighting: "rain", mAP: 0.724 },
  { id: "EXP-00131", occlusion: 0.45, camera: 12, lighting: "rain", mAP: 0.748 },
  { id: "EXP-00118", occlusion: 0.27, camera: 9, lighting: "rain", mAP: 0.691 },
  { id: "EXP-00097", occlusion: 0.31, camera: 16, lighting: "clear", mAP: 0.802 },
  { id: "EXP-00088", occlusion: 0.52, camera: 18, lighting: "night", mAP: 0.664 },
  { id: "EXP-00081", occlusion: 0.19, camera: 7, lighting: "clear", mAP: 0.771 },
  { id: "EXP-00074", occlusion: 0.4, camera: 15, lighting: "fog", mAP: 0.712 },
  { id: "EXP-00063", occlusion: 0.36, camera: 10, lighting: "fog", mAP: 0.735 },
  { id: "EXP-00055", occlusion: 0.24, camera: 14, lighting: "night", mAP: 0.688 },
  { id: "EXP-00041", occlusion: 0.48, camera: 8, lighting: "rain", mAP: 0.703 },
];
