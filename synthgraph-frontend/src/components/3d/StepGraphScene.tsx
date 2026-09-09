"use client";

import { LINEAGE_EDGES, LINEAGE_NODES } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphFallback } from "./GraphFallback";
import { ProvenanceGraph } from "./ProvenanceGraph";
import { SceneCanvas } from "./SceneCanvas";

/**
 * The how-it-works graph. It accumulates: each step adds the record that step
 * describes, and highlights it against the ones already there.
 */
export function StepGraphScene({
  visible,
  focus,
}: {
  visible: string[];
  focus: string | null;
}) {
  const isCompact = useIsCompact();
  const nodes = LINEAGE_NODES.filter((node) => visible.includes(node.id));
  const edges = LINEAGE_EDGES.filter(
    (edge) => visible.includes(edge.from) && visible.includes(edge.to),
  );

  return (
    <SceneErrorBoundary fallback={<GraphFallback />}>
      <SceneCanvas
        label="The provenance graph building up one record at a time as each step is described."
        className="h-[420px] w-full lg:h-[500px]"
        camera={{ position: isCompact ? [0, 0, 16.8] : [0, 0, 15], fov: 42 }}
        fallback={<GraphFallback />}
      >
        <CameraRig
          origin={isCompact ? [0, 0, 16.8] : [0, 0, 15]}
          parallax={isCompact ? 0 : 0.4}
          drift={0.16}
        />
        <ProvenanceGraph
          nodes={nodes}
          edges={edges}
          assembly={1}
          activeId={focus}
          scale={isCompact ? 1 : 0.85}
        />
      </SceneCanvas>
    </SceneErrorBoundary>
  );
}
