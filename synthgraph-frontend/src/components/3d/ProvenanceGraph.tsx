"use client";

import { useMemo } from "react";
import type { LineageNode } from "@/data/demo-data";
import { NODE_COLOR } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { seededRandom, smoothstep } from "@/lib/utils";
import { GraphEdge } from "./GraphEdge";
import { GraphNode, type NodeVisualState } from "./GraphNode";
import { ParticleFlow, type FlowEdge } from "./ParticleFlow";

export type GraphEdgeSpec = { from: string; to: string; primary?: boolean };

type ProvenanceGraphProps = {
  nodes: LineageNode[];
  edges: GraphEdgeSpec[];
  /**
   * 0 → scattered, unrelated artefacts. 1 → the assembled lineage.
   * This is the whole product argument expressed as one number.
   */
  assembly?: number;
  activeId?: string | null;
  onActivate?: (id: string | null) => void;
  showLabels?: boolean;
  particles?: boolean;
  scale?: number;
  scatterSeed?: number;
};

/** Quantised so scroll-driven assembly re-renders at most ~40 times. */
function quantise(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 40) / 40;
}

export function ProvenanceGraph({
  nodes,
  edges,
  assembly = 1,
  activeId = null,
  onActivate,
  showLabels = true,
  particles = true,
  scale = 1,
  scatterSeed = 8421,
}: ProvenanceGraphProps) {
  const isCompact = useIsCompact();
  const t = quantise(assembly);
  const eased = smoothstep(t);

  /** Deterministic pre-assembly positions: the "scattered artefacts" state. */
  const scattered = useMemo(() => {
    const random = seededRandom(scatterSeed);
    const map = new Map<string, [number, number, number]>();
    const spreadX = isCompact ? 7 : 15;
    const spreadY = isCompact ? 11 : 8.5;
    for (const node of nodes) {
      map.set(node.id, [
        (random() - 0.5) * spreadX,
        (random() - 0.5) * spreadY,
        (random() - 0.5) * 7,
      ]);
    }
    return map;
  }, [nodes, scatterSeed, isCompact]);

  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const node of nodes) {
      const from = scattered.get(node.id) ?? node.position;
      const to = isCompact ? node.compact : node.position;
      map.set(node.id, [
        (from[0] + (to[0] - from[0]) * eased) * scale,
        (from[1] + (to[1] - from[1]) * eased) * scale,
        (from[2] + (to[2] - from[2]) * eased) * scale,
      ]);
    }
    return map;
  }, [nodes, scattered, eased, scale, isCompact]);

  /** Nodes one hop from the active node stay lit; everything else dims. */
  const related = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    for (const edge of edges) {
      if (edge.from === activeId) set.add(edge.to);
      if (edge.to === activeId) set.add(edge.from);
    }
    return set;
  }, [activeId, edges]);

  const nodeState = (id: string): NodeVisualState => {
    if (!related) return "idle";
    if (id === activeId) return "active";
    return related.has(id) ? "idle" : "dim";
  };

  const flowEdges = useMemo<FlowEdge[]>(() => {
    if (!particles || eased < 0.55) return [];
    return edges.flatMap((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return [];
      const target = nodes.find((node) => node.id === edge.to);
      return [{ from, to, color: NODE_COLOR[target?.kind ?? "dataset"] }];
    });
  }, [edges, positions, nodes, particles, eased]);

  return (
    <group>
      {edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const target = nodes.find((node) => node.id === edge.to);
        const isRelated = related
          ? edge.from === activeId || edge.to === activeId
          : true;
        return (
          <GraphEdge
            key={`${edge.from}-${edge.to}`}
            from={from}
            to={to}
            color={NODE_COLOR[target?.kind ?? "dataset"]}
            width={edge.primary ? 1.4 : 1}
            state={related ? (isRelated ? "active" : "dim") : "idle"}
            reveal={smoothstep((eased - 0.25) / 0.6)}
          />
        );
      })}

      {flowEdges.length > 0 ? (
        <ParticleFlow
          edges={flowEdges}
          perEdge={isCompact ? 3 : 5}
          size={0.11 * scale}
        />
      ) : null}

      {nodes.map((node, index) => {
        const position = positions.get(node.id);
        if (!position) return null;
        return (
          <GraphNode
            key={node.id}
            position={position}
            color={NODE_COLOR[node.kind]}
            title={node.title}
            lines={node.lines}
            size={0.28 * scale}
            phase={index * 1.7}
            state={nodeState(node.id)}
            showLabel={showLabels && eased > 0.7}
            onHover={() => onActivate?.(node.id)}
            onLeave={() => onActivate?.(null)}
            onSelect={() => onActivate?.(node.id)}
          />
        );
      })}
    </group>
  );
}
