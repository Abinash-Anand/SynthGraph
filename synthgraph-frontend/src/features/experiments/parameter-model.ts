// Which parameters moved an outcome, and how much we can honestly say about
// it. Pure and framework-free so the statistics are unit-tested.
//
// Everything here describes association across the runs in one experiment -
// never cause. With a handful of runs that's weak evidence, so every result
// carries its sample size and a reliability grade, and below the minimum it
// refuses to produce a number at all rather than draw a confident chart out
// of noise (three runs, one per seed, "correlate" perfectly with anything).

export type ParameterRole = "seed" | "hyperparameter" | "environment" | "data" | "other";

const SEED = new Set(["seed", "seeds", "random_state", "rng", "rand"]);
const ENVIRONMENT = new Set([
  "env", "envs", "device", "platform", "episode", "simulator", "sim", "terrain", "task", "gravity", "backend",
]);
const DATA = new Set([
  "dataset", "data", "classes", "resolution", "image", "images", "augment", "augmentation", "split", "scenes", "samples",
]);
const HYPERPARAMETER = new Set([
  "lr", "learning", "rate", "batch", "gamma", "lambda", "epsilon", "clip", "entropy", "momentum", "decay", "dropout",
  "optimizer", "epochs", "epoch", "timesteps", "steps", "hidden", "layers", "units", "alpha", "beta", "tau",
  "horizon", "unroll", "minibatch", "minibatches", "updates", "discounting", "coef", "temperature",
]);

function words(key: string): string[] {
  return key
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function classifyParameter(key: string): ParameterRole {
  const parts = words(key);
  const has = (vocabulary: Set<string>) => parts.some((part) => vocabulary.has(part));
  // "random_state" is two words once split, so it needs its own check.
  if (has(SEED) || /random[_\-\s]?state/i.test(key)) return "seed";
  if (has(ENVIRONMENT)) return "environment";
  if (has(DATA)) return "data";
  if (has(HYPERPARAMETER)) return "hyperparameter";
  return "other";
}

export const ROLE_LABEL: Record<ParameterRole, string> = {
  seed: "seed",
  hyperparameter: "hyperparameter",
  environment: "environment",
  data: "data",
  other: "other",
};

export type ParameterRun = {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  /** The chosen outcome for this run (best evaluation in the metric's direction), or null. */
  outcome: number | null;
};

export type Reliability = "ok" | "low" | "none";

export type ValueGroup = { value: string; n: number; mean: number };

export type ParameterEffect = {
  key: string;
  role: ParameterRole;
  kind: "numeric" | "categorical";
  /** Runs with an outcome that this parameter was measured on. */
  n: number;
  distinct: number;
  /** 0..1 strength of association, or null when it can't be estimated honestly. */
  effect: number | null;
  /** Numeric parameters only: +1 means bigger values go with bigger outcomes. */
  correlation: number | null;
  reliability: Reliability;
  /** Why `effect` is null, or a caveat when it isn't. */
  note: string | null;
  groups: ValueGroup[];
};

export type NoiseFloor = {
  n: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  /** stdDev / |mean|, or null when the mean is ~0. */
  coefficientOfVariation: number | null;
};

export type ParameterAnalysis = {
  /** Runs that have an outcome and so can take part in any comparison. */
  usableRuns: number;
  totalRuns: number;
  effects: ParameterEffect[];
  /** Present when seeds vary: the spread seeds alone produce. */
  noiseFloor: NoiseFloor | null;
  /** True when seed is the only thing that differs, so the spread above is pure run-to-run noise. */
  seedOnly: boolean;
};

const MIN_RUNS_TO_RANK = 5;
const RELIABLE_RUNS = 8;

function keyOf(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value) ?? "undefined";
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

// Average ranks, so tied values share a rank instead of being ordered
// arbitrarily (which would invent a correlation among equal values).
function ranks(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) result[order[k].index] = rank;
    i = j + 1;
  }
  return result;
}

export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = mean(rx);
  const my = mean(ry);
  let numerator = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    numerator += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return numerator / Math.sqrt(dx * dy);
}

/** Share of outcome variance explained by group membership (0..1), or null with no variance. */
export function etaSquared(groups: number[][]): number | null {
  const all = groups.flat();
  if (all.length < 2) return null;
  const grand = mean(all);
  const total = all.reduce((sum, v) => sum + (v - grand) ** 2, 0);
  if (total === 0) return null;
  const between = groups.reduce((sum, g) => sum + g.length * (mean(g) - grand) ** 2, 0);
  return between / total;
}

function analyzeOne(key: string, runs: ParameterRun[]): ParameterEffect | null {
  const usable = runs.filter((run) => run.outcome !== null && key in run.parameters);
  const distinctKeys = new Set(usable.map((run) => keyOf(run.parameters[key])));
  if (distinctKeys.size < 2) return null; // constant: nothing to explain

  const role = classifyParameter(key);
  const values = usable.map((run) => run.parameters[key]);
  const outcomes = usable.map((run) => run.outcome as number);
  const numeric = values.every((v) => typeof v === "number" && Number.isFinite(v));
  const useNumeric = numeric && distinctKeys.size >= 3;

  const byValue = new Map<string, number[]>();
  usable.forEach((run) => {
    const k = keyOf(run.parameters[key]);
    byValue.set(k, [...(byValue.get(k) ?? []), run.outcome as number]);
  });
  const groups: ValueGroup[] = Array.from(byValue, ([value, list]) => ({
    value,
    n: list.length,
    mean: mean(list),
  })).sort((a, b) => (numeric ? Number(a.value) - Number(b.value) : a.value.localeCompare(b.value)));

  const base = { key, role, n: usable.length, distinct: distinctKeys.size, groups };

  if (usable.length < MIN_RUNS_TO_RANK) {
    return {
      ...base,
      kind: useNumeric ? "numeric" : "categorical",
      effect: null,
      correlation: null,
      reliability: "none",
      note: `Only ${usable.length} run${usable.length === 1 ? "" : "s"} with a result - at least ${MIN_RUNS_TO_RANK} are needed before an effect can be estimated.`,
    };
  }

  if (useNumeric) {
    const rho = spearman(values as number[], outcomes);
    return {
      ...base,
      kind: "numeric",
      effect: rho === null ? null : Math.abs(rho),
      correlation: rho,
      reliability: usable.length >= RELIABLE_RUNS ? "ok" : "low",
      note: rho === null ? "The outcome doesn't vary, so there is nothing to explain." : null,
    };
  }

  const sizes = groups.map((g) => g.n);
  if (sizes.every((size) => size === 1)) {
    return {
      ...base,
      kind: "categorical",
      effect: null,
      correlation: null,
      reliability: "none",
      note: "Every value was used by exactly one run, so its effect can't be told apart from run-to-run noise.",
    };
  }
  const eta = etaSquared(Array.from(byValue.values()));
  const smallest = Math.min(...sizes);
  return {
    ...base,
    kind: "categorical",
    effect: eta,
    correlation: null,
    reliability: smallest >= 3 ? "ok" : "low",
    note:
      eta === null
        ? "The outcome doesn't vary, so there is nothing to explain."
        : smallest === 1
          ? "At least one value was used by a single run."
          : null,
  };
}

export function analyzeParameters(runs: ParameterRun[]): ParameterAnalysis {
  const usable = runs.filter((run) => run.outcome !== null);
  const keys = Array.from(new Set(runs.flatMap((run) => Object.keys(run.parameters)))).sort();

  const effects: ParameterEffect[] = [];
  for (const key of keys) {
    const effect = analyzeOne(key, runs);
    if (effect) effects.push(effect);
  }

  const knobs = effects.filter((effect) => effect.role !== "seed");
  const seedVaries = effects.some((effect) => effect.role === "seed");

  let noiseFloor: NoiseFloor | null = null;
  if (seedVaries && usable.length >= 2) {
    const values = usable.map((run) => run.outcome as number);
    const m = mean(values);
    noiseFloor = {
      n: values.length,
      mean: m,
      stdDev: sampleStdDev(values),
      min: Math.min(...values),
      max: Math.max(...values),
      coefficientOfVariation: Math.abs(m) > 1e-12 ? sampleStdDev(values) / Math.abs(m) : null,
    };
  }

  // Strongest estimable effects first; non-estimable ones keep their order after.
  effects.sort((a, b) => {
    if ((a.effect === null) !== (b.effect === null)) return a.effect === null ? 1 : -1;
    return (b.effect ?? 0) - (a.effect ?? 0) || a.key.localeCompare(b.key);
  });

  return {
    usableRuns: usable.length,
    totalRuns: runs.length,
    effects,
    noiseFloor,
    seedOnly: seedVaries && knobs.length === 0,
  };
}
