// What a metric *means*, inferred from its name. The backend stores metrics
// as free-form keys with no declared direction or unit, but several screens
// need to know - "best run" has to know whether bigger is better, and the
// efficiency leaderboard must not rank runs by how long they took as if it
// were a score. These are heuristics, so callers should present the result
// as inferred, never as a fact the user configured.
//
// TEMPORARY. Guessing meaning from a name is a stop-gap for the lack of an
// explicit, declared metric direction (registry entry ARCH-001, in
// docs/architecture/architecture-violation-registry.md). Extend the lists below
// only to fix a wrong or missing guess for a common metric; the fix for the
// class of problem is declared direction metadata, after which this file's
// inference should be removed, not grown.

export type MetricDirection = "higher" | "lower" | "neutral";
export type MetricKind = "outcome" | "time" | "system" | "throughput" | "other";

// Segments are matched against the key split on non-alphanumerics, so
// "eval/episode_reward/feet_clearance" is checked word by word and
// "training_loss" matches "loss" without "glossary" matching it.
// Singular and plural are listed explicitly (not stemmed): "collision_rate" and
// "num_collisions" are both common, and a stemmer would also reach words like
// "maps" or "scores_dir" that were never meant.
const LOWER_BETTER = new Set([
  "loss", "losses", "error", "errors", "err", "mse", "mae", "rmse", "perplexity", "ppl", "wer", "cer",
  "regret", "distance", "dist", "latency", "kl", "cost", "penalty", "penalties",
  "violation", "violations", "collision", "collisions", "failure", "failures", "fall", "falls",
  "crash", "crashes",
]);
const HIGHER_BETTER = new Set([
  "reward", "rewards", "return", "returns", "acc", "accuracy", "map", "map50", "map75", "precision",
  "recall", "f1", "auc", "iou", "dice", "score", "scores", "success", "bleu", "rouge", "ndcg", "r2",
]);
// How widely a metric varies (across episodes, seeds or a batch), not how good
// it is: a rising "reward_std" is not good news and a rising "loss_std" is not
// bad news. Whatever the rest of the name says, these have no direction of
// their own to infer.
const SPREAD = new Set(["std", "stddev", "stdev", "var", "variance", "sigma", "stderr", "spread"]);
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
  if (hasAny(parts, LOWER_BETTER) || hasAny(parts, HIGHER_BETTER)) return "outcome";
  return "other";
}

export function metricDirection(key: string): MetricDirection {
  if (metricKind(key) !== "outcome") return "neutral";
  const parts = words(key);
  if (hasAny(parts, SPREAD)) return "neutral";
  const lower = hasAny(parts, LOWER_BETTER);
  const higher = hasAny(parts, HIGHER_BETTER);
  // Both ("reward_loss"?) is ambiguous - say so rather than guess.
  if (lower && higher) return "neutral";
  if (lower) return "lower";
  if (higher) return "higher";
  return "neutral";
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

export function directionLabel(direction: MetricDirection): string {
  if (direction === "higher") return "higher is better";
  if (direction === "lower") return "lower is better";
  return "no inferred direction";
}
