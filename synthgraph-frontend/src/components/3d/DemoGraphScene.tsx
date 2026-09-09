"use client";

import { useMemo } from "react";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import { ParticleFlow } from "./ParticleFlow";
import { SceneCanvas } from "./SceneCanvas";

type Vec3 = [number, number, number];

/**
 * The nodes correspond to the fields of the demo form. Answering a question
 * lights the part of the graph it describes, so the form itself demonstrates
 * the shape of a provenance record.
 */
export const DEMO_NODES: Array<{
  id: string;
  title: string;
  color: string;
  position: Vec3;
  compact: Vec3;
}> = [
  { id: "researcher", title: "RESEARCHER", color: "#7f8ea8", position: [-4, 2.4, 0], compact: [0, 4.1, 0] },
  { id: "workflow", title: "WORKFLOW", color: "#a78bfa", position: [-2.4, -0.2, 0.4], compact: [0, 2.3, 0] },
  { id: "generation", title: "GENERATION", color: "#37c9de", position: [-0.6, 2.2, -0.4], compact: [0, 0.5, 0] },
  { id: "dataset", title: "DATASET", color: "#5b8dfb", position: [1.2, -0.4, 0.2], compact: [0, -1.3, 0] },
  { id: "training", title: "TRAINING", color: "#d9a441", position: [3, 2, 0], compact: [0, -3.1, 0] },
  { id: "evaluation", title: "EVALUATION", color: "#46b97e", position: [4.2, -0.8, -0.3], compact: [0, -4.9, 0] },
];

const DEMO_EDGES: Array<[string, string]> = [
  ["researcher", "workflow"],
  ["workflow", "generation"],
  ["generation", "dataset"],
  ["dataset", "training"],
  ["training", "evaluation"],
];

export function DemoGraphScene({ active }: { active: string[] }) {
  const isCompact = useIsCompact();
  const activeSet = useMemo(() => new Set(active), [active]);

  const positionOf = (id: string): Vec3 | null => {
    const node = DEMO_NODES.find((candidate) => candidate.id === id);
    if (!node) return null;
    return isCompact ? node.compact : node.position;
  };

  const litEdges = DEMO_EDGES.filter(([from, to]) => activeSet.has(from) && activeSet.has(to));

  return (
    <SceneErrorBoundary>
      <SceneCanvas
        label="A provenance graph that lights up as the demo form is filled in: researcher, workflow, generation, dataset, training run and evaluation result."
        className="h-[320px] w-full lg:h-[440px]"
        camera={{ position: isCompact ? [0, -0.4, 15.5] : [0.2, 0.4, 13.5], fov: 42 }}
      >
        <CameraRig
          origin={isCompact ? [0, -0.4, 15.5] : [0.2, 0.4, 13.5]}
          parallax={isCompact ? 0 : 0.4}
          drift={0.16}
        />

        {DEMO_EDGES.map(([from, to]) => {
          const a = positionOf(from);
          const b = positionOf(to);
          if (!a || !b) return null;
          const lit = activeSet.has(from) && activeSet.has(to);
          return (
            <GraphEdge
              key={`${from}-${to}`}
              from={a}
              to={b}
              color="#37c9de"
              state={lit ? "active" : "dim"}
              bow={0.14}
            />
          );
        })}

        {litEdges.length > 0 ? (
          <ParticleFlow
            edges={litEdges.flatMap(([from, to]) => {
              const a = positionOf(from);
              const b = positionOf(to);
              return a && b ? [{ from: a, to: b, color: "#37c9de", bow: 0.14 }] : [];
            })}
            perEdge={isCompact ? 2 : 4}
            size={0.07}
          />
        ) : null}

        {DEMO_NODES.map((node, index) => (
          <GraphNode
            key={node.id}
            position={isCompact ? node.compact : node.position}
            color={node.color}
            title={node.title}
            size={0.24}
            phase={index * 1.6}
            state={activeSet.has(node.id) ? "active" : "dim"}
          />
        ))}
      </SceneCanvas>
    </SceneErrorBoundary>
  );
}
