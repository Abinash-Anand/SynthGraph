"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { cubicBezierEasing } from "./cubic-bezier-easing";

// ReactFlow's fitViewOptions.ease wants a raw easing function, not a CSS
// cubic-bezier string/array (that's what Motion's `ease` prop takes
// instead) - built once so fitView doesn't recompute it on every render.
const FIT_VIEW_EASE = cubicBezierEasing(0.16, 1, 0.3, 1);

// The Controls buttons' background/color/border come from a CSS custom
// property (`--xy-controls-button-*`, ReactFlow's own documented theming
// hooks), not a class the panel's own `background` shorthand can be beaten
// with via Tailwind's `!important` - a `!bg-transparent` class on the
// button loses that fight since it's overriding a variable's fallback, not
// a plain declaration. Set through `style` instead.
const CONTROLS_BUTTON_VARS = {
  "--xy-controls-button-background-color": "transparent",
  "--xy-controls-button-background-color-hover": "rgba(255, 255, 255, 0.1)",
  "--xy-controls-button-color": "#cbd5e1",
  "--xy-controls-button-color-hover": "#f1f5f9",
  "--xy-controls-button-border-color": "rgba(255, 255, 255, 0.1)",
} as CSSProperties;

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

const KIND_LABEL: Record<LineageNodeKind, string> = {
  dataset: "dataset",
  asset: "asset",
  generation: "generation",
  "training-run": "training run",
  evaluation: "evaluation",
};

// Beyond this many nodes of the same kind in one layer, a lineage graph
// stops communicating structure and becomes a wall of identical-looking
// boxes (the audit's literal "16 generations" complaint) - those groups
// collapse into one summary node by default, expandable on click.
const COLLAPSE_THRESHOLD = 6;

function groupKey(layer: number, kind: LineageNodeKind): string {
  return `${layer}:${kind}`;
}

/**
 * Collapses any (layer, kind) group over the threshold into one synthetic
 * summary node, redirecting edges to/from its members onto that node and
 * dropping resulting duplicate edges. Kept as a pre-pass over plain
 * (nodes, edges) so layoutNodes/connectedNodeIds/edge-building below don't
 * need to know collapsing exists at all - they just see a smaller graph.
 */
function applyCollapse(
  nodes: LineageGraphNode[],
  edges: LineageGraphEdge[],
  collapsedGroups: Set<string>,
  selectedId: string | null,
): { nodes: LineageGraphNode[]; edges: LineageGraphEdge[]; idRemap: Map<string, string>; selectedId: string | null } {
  const byGroup = new Map<string, LineageGraphNode[]>();
  for (const node of nodes) {
    const key = groupKey(node.layer, node.kind);
    const list = byGroup.get(key) ?? [];
    list.push(node);
    byGroup.set(key, list);
  }

  // Never hide the node the user actually has selected - force its group
  // open regardless of the (possibly stale) manual/default collapse state.
  const selectedGroupKey = selectedId
    ? groupKey(
        nodes.find((n) => n.id === selectedId)?.layer ?? -1,
        nodes.find((n) => n.id === selectedId)?.kind ?? "generation",
      )
    : null;

  const idRemap = new Map<string, string>();
  const outNodes: LineageGraphNode[] = [];
  for (const [key, members] of byGroup) {
    const collapse = collapsedGroups.has(key) && key !== selectedGroupKey;
    if (!collapse) {
      for (const member of members) {
        idRemap.set(member.id, member.id);
        outNodes.push(member);
      }
      continue;
    }
    const groupId = `group:${key}`;
    for (const member of members) idRemap.set(member.id, groupId);
    const [{ layer, kind }] = members;
    outNodes.push({
      id: groupId,
      kind,
      label: `${members.length} ${KIND_LABEL[kind]}s`,
      layer,
    });
  }

  const seenEdges = new Set<string>();
  const outEdges: LineageGraphEdge[] = [];
  for (const edge of edges) {
    const source = idRemap.get(edge.source) ?? edge.source;
    const target = idRemap.get(edge.target) ?? edge.target;
    if (source === target) continue;
    const key = `${source}->${target}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    outEdges.push({ id: key, source, target });
  }

  return {
    nodes: outNodes,
    edges: outEdges,
    idRemap,
    selectedId: selectedId ? (idRemap.get(selectedId) ?? selectedId) : null,
  };
}

/**
 * Orders nodes within each layer by the average row-position of their
 * already-placed predecessors (a single-pass barycenter heuristic) instead
 * of raw push-order, so edges tend to run roughly left-to-right/flat rather
 * than crossing arbitrarily. Not a full Sugiyama layout (no iterative
 * refinement, no crossing count minimization) - just enough to keep a
 * multi-generation layer from looking randomly shuffled relative to its
 * dataset/training-run neighbors.
 */
function layoutNodes(
  nodes: LineageGraphNode[],
  edges: LineageGraphEdge[],
  selectedId: string | null,
  connectedIds: Set<string>,
): Node[] {
  const byLayer = new Map<number, LineageGraphNode[]>();
  for (const node of nodes) {
    const list = byLayer.get(node.layer) ?? [];
    list.push(node);
    byLayer.set(node.layer, list);
  }
  const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);

  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
  }

  const rowIndex = new Map<string, number>();
  const orderedByLayer = new Map<number, LineageGraphNode[]>();
  sortedLayers.forEach((layer, layerPosition) => {
    const layerNodes = byLayer.get(layer)!;
    let ordered: LineageGraphNode[];
    if (layerPosition === 0) {
      ordered = layerNodes;
    } else {
      const withBarycenter = layerNodes.map((node, originalIndex) => {
        const sourceRows = (incoming.get(node.id) ?? [])
          .map((id) => rowIndex.get(id))
          .filter((row): row is number => row !== undefined);
        const barycenter =
          sourceRows.length > 0
            ? sourceRows.reduce((sum, row) => sum + row, 0) / sourceRows.length
            : Number.POSITIVE_INFINITY; // unconnected nodes sink after connected ones
        return { node, barycenter, originalIndex };
      });
      withBarycenter.sort((a, b) => a.barycenter - b.barycenter || a.originalIndex - b.originalIndex);
      ordered = withBarycenter.map((entry) => entry.node);
    }
    orderedByLayer.set(layer, ordered);
    ordered.forEach((node, index) => rowIndex.set(node.id, index));
  });

  const result: Node[] = [];
  for (const layer of sortedLayers) {
    orderedByLayer.get(layer)!.forEach((node, index) => {
      const muted = selectedId !== null && !connectedIds.has(node.id);
      result.push({
        id: node.id,
        type: "lineageNode",
        position: { x: layer * COLUMN_WIDTH, y: index * ROW_HEIGHT },
        data: {
          label: node.label,
          sublabel: node.sublabel,
          kind: node.kind,
          muted,
          selected: node.id === selectedId,
          isGroup: node.id.startsWith("group:"),
        },
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
  const isGroup = data.isGroup as boolean;
  const colorVar = NODE_COLOR_VAR[kind];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={
        isGroup
          ? `${label}, collapsed - click to expand`
          : `${kind.replace("-", " ")}: ${label}${sublabel ? `, ${sublabel}` : ""}`
      }
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
        isGroup && "border-dashed",
        muted ? "opacity-30" : "opacity-100",
      )}
      style={{
        width: NODE_WIDTH,
        borderColor: selected
          ? `var(${colorVar})`
          : `color-mix(in oklab, var(${colorVar}) ${isGroup ? "70%" : "45%"}, transparent)`,
        boxShadow: selected ? `0 0 0 1px var(${colorVar})` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: `var(${colorVar})`, border: "none" }} />
      {isGroup ? (
        <p className="truncate text-[13px] text-research-ink">
          <span aria-hidden>+ </span>
          {label}
        </p>
      ) : (
        <p className="truncate text-[13px] text-research-ink">{label}</p>
      )}
      {isGroup ? (
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-research-ink-muted">click to expand</p>
      ) : sublabel ? (
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

function defaultCollapsedGroups(nodes: LineageGraphNode[]): Set<string> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const key = groupKey(node.layer, node.kind);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > COLLAPSE_THRESHOLD).map(([key]) => key));
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => defaultCollapsedGroups(nodes));

  const collapsed = useMemo(
    () => applyCollapse(nodes, edges, collapsedGroups, selectedId),
    [nodes, edges, collapsedGroups, selectedId],
  );
  const graphNodes = collapsed.nodes;
  const graphEdges = collapsed.edges;
  const effectiveSelectedId = collapsed.selectedId;

  const connectedIds = useMemo(
    () => connectedNodeIds(effectiveSelectedId, graphEdges),
    [effectiveSelectedId, graphEdges],
  );

  const flowNodes = useMemo(
    () => layoutNodes(graphNodes, graphEdges, effectiveSelectedId, connectedIds),
    [graphNodes, graphEdges, effectiveSelectedId, connectedIds],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graphEdges.map((edge) => {
        const isConnected = connectedIds.has(edge.source) && connectedIds.has(edge.target);
        const muted = effectiveSelectedId !== null && !isConnected;
        const highlighted = effectiveSelectedId !== null && isConnected;
        const color = highlighted ? "#8b5cf6" : "#52525b";
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          style: { stroke: color, strokeWidth: highlighted ? 2 : 1.5, opacity: muted ? 0.2 : 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          animated: false,
        };
      }),
    [graphEdges, effectiveSelectedId, connectedIds],
  );

  // A fixed height squashes/clips a layer with many nodes; scale with the
  // densest layer of the (post-collapse) graph instead, capped so a huge
  // graph still fits in a bounded card - ReactFlow's own pan/zoom (via
  // fitView + Controls) handles anything beyond that.
  const canvasHeight = useMemo(() => {
    const perLayerCount = new Map<number, number>();
    for (const node of graphNodes) perLayerCount.set(node.layer, (perLayerCount.get(node.layer) ?? 0) + 1);
    const maxInLayer = Math.max(1, ...Array.from(perLayerCount.values()));
    return Math.min(720, Math.max(320, maxInLayer * ROW_HEIGHT + 80));
  }, [graphNodes]);

  if (nodes.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">Nothing to show lineage for yet.</p>;
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-research-border bg-research-bg"
      style={{ height: canvasHeight }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("group:")) {
            const key = node.id.slice("group:".length);
            setCollapsedGroups((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            return;
          }
          const original = nodes.find((n) => n.id === node.id);
          if (original) onNodeSelect(original.id, original.kind);
        }}
        fitView
        fitViewOptions={{ duration: 800, ease: FIT_VIEW_EASE }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f1f23" />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-white/10 !bg-slate-900/60 !shadow-lg backdrop-blur-md"
          style={CONTROLS_BUTTON_VARS}
        />
      </ReactFlow>
    </div>
  );
}
