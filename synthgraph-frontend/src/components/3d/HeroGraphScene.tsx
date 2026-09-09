"use client";

import { useState } from "react";
import { LINEAGE_EDGES, LINEAGE_NODES } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useMountProgress } from "@/hooks/useMountProgress";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { clamp, remap } from "@/lib/utils";
import { Inspector } from "@/components/ui/Inspector";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { ProvenanceGraph } from "./ProvenanceGraph";
import { SceneCanvas } from "./SceneCanvas";
import { GraphFallback } from "./GraphFallback";

/**
 * The hero scene: seven provenance records assembling themselves on load,
 * then reachable by pointer. Scroll pulls the camera back so the whole
 * lineage is in frame as the visitor moves into the page.
 */
export function HeroGraphScene() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isCompact = useIsCompact();
  const assembly = useMountProgress(2200, 350);
  const [scrollRef, scrollProgress] = useScrollProgress<HTMLDivElement>();

  const activeNode = LINEAGE_NODES.find((node) => node.id === activeId) ?? null;

  // Nodes read as a cloud on a phone; drop the secondary records there.
  const nodes = isCompact
    ? LINEAGE_NODES.filter((node) =>
        ["generation", "dataset", "training", "evaluation"].includes(node.id),
      )
    : LINEAGE_NODES;
  const edges = isCompact
    ? LINEAGE_EDGES.filter(
        (edge) =>
          nodes.some((node) => node.id === edge.from) &&
          nodes.some((node) => node.id === edge.to),
      )
    : LINEAGE_EDGES;

  return (
    <div ref={scrollRef} className="relative">
      <SceneErrorBoundary fallback={<GraphFallback />}>
        <SceneCanvas
          label="Interactive provenance graph: a generation run feeds a dataset version, which feeds a training run, which produces an evaluation result."
          className="h-[420px] w-full sm:h-[460px] lg:h-[500px]"
          camera={{ position: isCompact ? [0, 0, 12.4] : [0, 0, 11.6], fov: 42 }}
          fallback={<GraphFallback />}
        >
          <CameraRig
            origin={isCompact ? [0, 0, 12.4] : [0, 0, 11.6]}
            parallax={isCompact ? 0 : 0.75}
            drift={0.22}
            zoom={remap(scrollProgress, 0.5, 1, 0, 2.4)}
          />
          <ProvenanceGraph
            nodes={nodes}
            edges={edges}
            assembly={clamp(assembly, 0, 1)}
            activeId={activeId}
            onActivate={setActiveId}
            scale={1}
          />
        </SceneCanvas>
      </SceneErrorBoundary>

      <div className="pointer-events-none absolute right-0 bottom-3 hidden lg:block">
        <Inspector node={activeNode} className="pointer-events-auto" />
      </div>
    </div>
  );
}
