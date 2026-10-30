import type { ReproductionManifest } from "@/features/reproduction/types/reproduction-manifest";
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

/**
 * The manifest's `generation.parameters` is the same object as the
 * generation's own `parameters` (the backend builds both from one entity), and
 * the one place that shows it - the raw manifest view - can take it from the
 * generation. So the manifest's copy is not sent: a function's source in the
 * parameters would otherwise travel twice per generation. The key stays, with
 * an empty object, so the manifest keeps its shape and key order and
 * `withManifestParameters` can put the real value back in place.
 */
function withoutDuplicateParameters(manifest: ReproductionManifest): ReproductionManifest {
  return { ...manifest, generation: { ...manifest.generation, parameters: {} } };
}

export function slimGeneration(enriched: EnrichedGeneration): EnrichedGeneration {
  const { generation, manifest } = enriched;
  return {
    ...enriched,
    generation: withoutNormalizedMirror(generation),
    manifest: manifest
      ? withoutDuplicateParameters(
          withoutNormalizedMirror({ ...manifest, generation: withoutNormalizedMirror(manifest.generation) }),
        )
      : manifest,
  };
}

/**
 * The manifest as the backend returned it, for display: the parameters that
 * `slimGeneration` left out are taken back from the generation they came from.
 */
export function withManifestParameters(enriched: EnrichedGeneration): ReproductionManifest | null {
  const { generation, manifest } = enriched;
  if (!manifest) return null;
  return { ...manifest, generation: { ...manifest.generation, parameters: generation.parameters } };
}
