// What *kind* of metric a key looks like, inferred from its name. The backend
// stores metrics as free-form keys with no declared unit or kind, and several
// screens need to tell model outcomes (reward, loss, mAP) from machine
// telemetry (time, memory, throughput) - to order lists, and to keep the
// efficiency leaderboard from ranking runs by how long they took as if that
// were a score. These are heuristics, so callers should present the result as
// inferred, never as a fact the user configured.
//
// This file no longer infers which direction is *better*. That is declared by
// the researcher and read from the backend (see ./metric-direction.ts, registry
// entry ARCH-001). `metricKind` stays inferred until a separate metadata design
// is approved.

export type MetricKind = "outcome" | "time" | "system" | "throughput" | "other";

// Segments are matched against the key split on non-alphanumerics, so
// "eval/episode_reward/feet_clearance" is checked word by word and
// "training_loss" matches "loss" without "glossary" matching it.
// Singular and plural are listed explicitly (not stemmed): "collision_rate" and
// "num_collisions" are both common, and a stemmer would also reach words like
// "maps" or "scores_dir" that were never meant. These words only mean "this
// is a model outcome"; they say nothing about which way is better.
const OUTCOME = new Set([
  "loss", "losses", "error", "errors", "err", "mse", "mae", "rmse", "perplexity", "ppl", "wer", "cer",
  "regret", "distance", "dist", "latency", "kl", "cost", "penalty", "penalties",
  "violation", "violations", "collision", "collisions", "failure", "failures", "fall", "falls",
  "crash", "crashes",
  "reward", "rewards", "return", "returns", "acc", "accuracy", "map", "map50", "map75", "precision",
  "recall", "f1", "auc", "iou", "dice", "score", "scores", "success", "bleu", "rouge", "ndcg", "r2",
]);
const TIME = new Set(["elapsed", "seconds", "walltime", "duration", "time", "runtime", "epoch_time"]);
const SYSTEM = new Set(["cpu", "memory", "mem", "gpu", "ram", "disk", "vram", "utilization"]);
const THROUGHPUT = new Set(["sps", "fps", "throughput", "samples", "steps_per_sec"]);

function words(key: string): string[] {
  return key
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasAny(parts: string[], vocabulary: Set<string>): boolean {
  return parts.some((part) => vocabulary.has(part));
}

export function metricKind(key: string): MetricKind {
  const parts = words(key);
  // "eval/epoch_eval_time" is a time measurement even though "eval" is
  // outcome-flavoured, so cost-like kinds are checked before outcomes.
  if (hasAny(parts, TIME) || key.toLowerCase().includes("epoch_time")) return "time";
  if (hasAny(parts, THROUGHPUT)) return "throughput";
  if (hasAny(parts, SYSTEM)) return "system";
  if (hasAny(parts, OUTCOME)) return "outcome";
  return "other";
}

/** Time/system/throughput readings describe the machine, not the model. */
export function isOutcomeMetric(key: string): boolean {
  const kind = metricKind(key);
  return kind === "outcome" || kind === "other";
}

/** Orders keys so outcome metrics (reward, loss, mAP...) lead and system noise trails. */
export function compareMetricKeys(a: string, b: string): number {
  const rank = (key: string) => (metricKind(key) === "outcome" ? 0 : metricKind(key) === "other" ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b);
}
