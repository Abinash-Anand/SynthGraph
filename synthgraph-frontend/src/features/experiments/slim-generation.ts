import type { EnrichedGeneration } from "./types/experiment-workspace";

/**
 * The backend repeats a generation's `parameters` under `normalized` as an
 * additive mirror for API clients. The workspace never reads it, but it is
 * sent to the browser as page data - and a generation's parameters can carry a
 * whole function's source, so each unused copy costs kilobytes per generation
 * (more than twice over once the reproduction manifest repeats the generation,
 * both under `generation` and as its own `normalized`).
 */
function withoutNormalizedMirror<T extends object>(value: T): T {
  if (!("normalized" in value)) return value;
  const copy: Record<string, unknown> = { ...value };
  delete copy.normalized;
  return copy as T;
}

export function slimGeneration(enriched: EnrichedGeneration): EnrichedGeneration {
  const { generation, manifest } = enriched;
  return {
    ...enriched,
    generation: withoutNormalizedMirror(generation),
    manifest: manifest
      ? withoutNormalizedMirror({ ...manifest, generation: withoutNormalizedMirror(manifest.generation) })
      : manifest,
  };
}
