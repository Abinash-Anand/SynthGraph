"use client";

import { useState } from "react";
import { isCodeLikeString, JsonTree } from "./JsonTree";

type PrimitiveLeaf = string | number | boolean | null;
type FlattenedEntry = { path: string; value: PrimitiveLeaf };

// Real generation/training-run parameter blobs are rarely flat - a
// domain-randomization config nests scalars 2-3 levels deep inside
// env_config/reward_config/etc. A strict "first 5 top-level keys" cut
// would show 0 useful badges for those (the top level is all objects), so
// this descends into primitive leaves (dotted path as the label) instead of
// stopping at depth 0. Capped at maxDepth so a pathologically deep object
// can't make this loop unbounded - anything past the cap is still fully
// visible in the "full configuration" tree below, just not flattened here.
function flattenPrimitives(
  value: unknown,
  prefix: string,
  depth: number,
  maxDepth: number,
  out: FlattenedEntry[],
): void {
  // A code-like string (e.g. domain_randomize.source, a Python function
  // body) is a primitive by JS's typeof check, but showing it in a badge
  // grid is exactly the raw-dump-in-a-narrow-rail problem this component
  // exists to prevent - excluded the same way a nested object is, so it
  // only ever surfaces through JsonTree's own collapsed code-block handling.
  if (typeof value === "string" && isCodeLikeString(value)) return;

  if (value === null || typeof value !== "object") {
    out.push({ path: prefix, value: value as PrimitiveLeaf });
    return;
  }
  if (depth >= maxDepth) return;

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  for (const [key, entryValue] of entries) {
    flattenPrimitives(entryValue, prefix ? `${prefix}.${key}` : key, depth + 1, maxDepth, out);
  }
}

/**
 * Progressive disclosure for a parameters/metrics object: the first
 * `primaryCount` primitive leaves as a 2-column badge grid (the "at a
 * glance" values), with everything else - remaining leaves and any nested
 * objects/arrays/long strings - tucked behind a "View full configuration"
 * toggle that renders the complete `JsonTree` (which has its own per-node
 * collapse and long-string/code handling). Replaces dumping the whole
 * object into a flat, unbounded key:value list.
 */
export function ConfigSummary({
  data,
  primaryCount = 5,
  maxDepth = 3,
  formatValue = (value) => String(value),
  fullLabel = "View full configuration",
  emptyLabel = "None",
}: {
  data: Record<string, unknown>;
  primaryCount?: number;
  maxDepth?: number;
  formatValue?: (value: PrimitiveLeaf) => string;
  fullLabel?: string;
  emptyLabel?: string;
}) {
  const [showFull, setShowFull] = useState(false);
  const topLevelEntries = Object.entries(data);

  if (topLevelEntries.length === 0) {
    return <p className="text-[13px] text-research-ink-muted">{emptyLabel}</p>;
  }

  const flattened: FlattenedEntry[] = [];
  flattenPrimitives(data, "", 0, maxDepth, flattened);
  const primary = flattened.slice(0, primaryCount);
  const hasMore =
    flattened.length > primary.length ||
    topLevelEntries.some(([, value]) => value !== null && typeof value === "object");

  return (
    <div className="flex flex-col gap-2">
      {primary.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {primary.map((entry) => {
            const formatted = formatValue(entry.value);
            return (
              <div
                key={entry.path}
                className="min-w-0 rounded-md border border-research-border bg-research-subtle/40 px-2.5 py-1.5"
              >
                <p className="truncate font-mono text-[10px] text-research-ink-muted" title={entry.path}>
                  {entry.path}
                </p>
                <p className="truncate font-mono text-[12.5px] text-research-ink" title={formatted}>
                  {formatted}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setShowFull((value) => !value)}
          className="self-start font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
        >
          {showFull ? "Hide full configuration" : fullLabel}
        </button>
      ) : null}

      {showFull ? (
        <div className="max-h-[320px] overflow-y-auto rounded-lg border border-research-border bg-research-bg p-3">
          <JsonTree value={data} />
        </div>
      ) : null}
    </div>
  );
}
