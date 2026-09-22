"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type LineageNodeKind = "dataset" | "asset" | "generation" | "training-run" | "evaluation";

export type LineageGraphNode = {
  id: string;
  kind: LineageNodeKind;
  label: string;
  sublabel?: string;
  /** 0-based column - the backend-authoritative relationship order
   * (Generation -> Dataset -> Training Run -> Evaluation), never inferred
   * by the frontend from names/timestamps/ordering. */
  layer: number;
};

export type LineageGraphEdge = { id: string; source: string; target: string };

const NODE_COLOR_VAR: Record<LineageNodeKind, string> = {
  generation: "--color-node-generation",
  dataset: "--color-node-dataset",
  asset: "--color-node-asset",
  "training-run": "--color-node-training",
  evaluation: "--color-node-evaluation",
};

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 76;
const NODE_WIDTH = 200;

function layoutNodes(
  nodes: LineageGraphNode[],
  selectedId: string | null,
  connectedIds: Set<string>,
): Node[] {
  const byLayer = new Map<number, LineageGraphNode[]>();
  for (const node of nodes) {
    const list = byLayer.get(node.layer) ?? [];
    list.push(node);
    byLayer.set(node.layer, list);
  }

  const result: Node[] = [];
  for (const [layer, layerNodes] of byLayer) {
    layerNodes.forEach((node, index) => {
      const muted = selectedId !== null && !connectedIds.has(node.id);
      result.push({
        id: node.id,
        type: "lineageNode",
        position: { x: layer * COLUMN_WIDTH, y: index * ROW_HEIGHT },
        data: { label: node.label, sublabel: node.sublabel, kind: node.kind, muted, selected: node.id === selectedId },
        draggable: false,
      });
    });
  }
  return result;
}

function LineageNodeRenderer({ data }: NodeProps) {
  const kind = data.kind as LineageNodeKind;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;
  const muted = data.muted as boolean;
  const selected = data.selected as boolean;
  const colorVar = NODE_COLOR_VAR[kind];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${kind.replace("-", " ")}: ${label}${sublabel ? `, ${sublabel}` : ""}`}
      // React Flow's own click handling is wired at the <ReactFlow>
      // level (onNodeClick), not per-node - dispatching a real click via
      // .click() on Enter/Space runs through that same pipeline rather
      // than needing onNodeSelect threaded into every node's closure.
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className={cn(
        "cursor-pointer rounded-lg border bg-research-surface px-3 py-2.5 transition-opacity duration-200",
        muted ? "opacity-30" : "opacity-100",
      )}
      style={{
        width: NODE_WIDTH,
        borderColor: selected
          ? `var(${colorVar})`
          : `color-mix(in oklab, var(${colorVar}) 45%, transparent)`,
        boxShadow: selected ? `0 0 0 1px var(${colorVar})` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: `var(${colorVar})`, border: "none" }} />
      <p className="truncate text-[13px] text-research-ink">{label}</p>
      {sublabel ? (
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-research-ink-muted">{sublabel}</p>
      ) : null}
      <Handle type="source" position={Position.Right} style={{ background: `var(${colorVar})`, border: "none" }} />
    </div>
  );
}

const nodeTypes = { lineageNode: LineageNodeRenderer };

/** Selecting a node highlights every node/edge on a path through it (both
 * directions) and mutes the rest - the "linked visualization" model from
 * docs/frontendarchitecture.md. */
function connectedNodeIds(
  selectedId: string | null,
  edges: LineageGraphEdge[],
): Set<string> {
  if (!selectedId) return new Set();
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  for (const edge of edges) {
    forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge.target]);
    backward.set(edge.target, [...(backward.get(edge.target) ?? []), edge.source]);
  }

  const visited = new Set<string>([selectedId]);
  const walk = (start: string, graph: Map<string, string[]>) => {
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of graph.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  };
  walk(selectedId, forward);
  walk(selectedId, backward);
  return visited;
}

export function LineageGraph({
  nodes,
  edges,
  selectedId,
  onNodeSelect,
}: {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  selectedId: string | null;
  onNodeSelect: (id: string, kind: LineageNodeKind) => void;
}) {
  const connectedIds = useMemo(() => connectedNodeIds(selectedId, edges), [selectedId, edges]);

  const flowNodes = useMemo(
    () => layoutNodes(nodes, selectedId, connectedIds),
    [nodes, selectedId, connectedIds],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const muted = selectedId !== null && !(connectedIds.has(edge.source) && connectedIds.has(edge.target));
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          style: { stroke: "#3f3f46", opacity: muted ? 0.2 : 1 },
          animated: false,
        };
      }),
    [edges, selectedId, connectedIds],
  );

  if (nodes.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">Nothing to show lineage for yet.</p>;
  }

  return (
    <div className="h-[460px] overflow-hidden rounded-xl border border-research-border bg-research-bg">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          const original = nodes.find((n) => n.id === node.id);
          if (original) onNodeSelect(original.id, original.kind);
        }}
        fitView
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f1f23" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
