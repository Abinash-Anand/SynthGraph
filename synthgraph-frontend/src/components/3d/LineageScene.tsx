"use client";

import { useState } from "react";
import { LINEAGE_EDGES, LINEAGE_NODES } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useInView } from "@/hooks/useInView";
import { useMountProgress } from "@/hooks/useMountProgress";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { remap } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Inspector } from "@/components/ui/Inspector";
import { CameraRig } from "./CameraRig";
import { GraphFallback } from "./GraphFallback";
import { ProvenanceGraph } from "./ProvenanceGraph";
import { SceneCanvas } from "./SceneCanvas";

/**
 * The large lineage section. Scroll drives a slow dolly across the graph so
 * the four primary records come into frame in causal order.
 */
export function LineageScene() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isCompact = useIsCompact();
  const [sectionRef, progress] = useScrollProgress<HTMLDivElement>();
  const [seenRef, seen] = useInView<HTMLDivElement>({ once: true, rootMargin: "-120px" });
  const assembly = useMountProgress(1600, 0);

  const activeNode = LINEAGE_NODES.find((node) => node.id === activeId) ?? null;

  return (
    <div ref={sectionRef}>
      <div ref={seenRef} className="relative">
        <SceneErrorBoundary fallback={<GraphFallback />}>
          <SceneCanvas
            label="Full provenance lineage: code and asset versions feed a generation run, which produces a dataset version, which feeds a training run, which produces an evaluation result."
            className="h-[520px] w-full lg:h-[620px]"
            camera={{ position: isCompact ? [0, 0, 16.8] : [0, 0, 14], fov: 42 }}
            fallback={<GraphFallback />}
          >
            <CameraRig
              origin={
                isCompact
                  ? [0, 0, 16.8]
                  : [remap(progress, 0.15, 0.85, -2.2, 2.2), 0, 14]
              }
              parallax={isCompact ? 0 : 0.6}
              drift={0.2}
              zoom={isCompact ? 0 : remap(progress, 0.2, 0.8, 1.6, -1.2)}
            />
            <ProvenanceGraph
              nodes={LINEAGE_NODES}
              edges={LINEAGE_EDGES}
              assembly={seen ? assembly : 0.12}
              activeId={activeId}
              onActivate={setActiveId}
              scale={isCompact ? 1 : 1.06}
            />
          </SceneCanvas>
        </SceneErrorBoundary>

        <div className="pointer-events-none absolute top-4 right-4 hidden lg:block">
          <Inspector
            node={activeNode}
            className="pointer-events-auto"
            hint="Hover any record. Connected records stay lit; unrelated ones fall back."
          />
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <Inspector node={activeNode} className="max-w-none" hint="Tap a record to inspect it." />
      </div>
    </div>
  );
}
