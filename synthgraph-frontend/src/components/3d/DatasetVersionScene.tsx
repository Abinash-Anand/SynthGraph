"use client";

import { useInView } from "@/hooks/useInView";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useMountProgress } from "@/hooks/useMountProgress";
import { clamp, smoothstep } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import { SceneCanvas } from "./SceneCanvas";

type Vec3 = [number, number, number];

type VersionNode = {
  id: string;
  position: Vec3;
  compact: Vec3;
  color: string;
  title: string;
  lines: [string, string];
  /** Reveal order, 0 → 1. */
  at: number;
};

const NODES: VersionNode[] = [
  {
    id: "root",
    position: [-6.6, 0, 0],
    compact: [0, 3.4, 0],
    color: "#5b8dfb",
    title: "DATASET",
    lines: ["rain_dataset", "logical"],
    at: 0,
  },
  {
    id: "v1",
    position: [-3.4, 2.5, 0],
    compact: [-2.1, 1.1, 0],
    color: "#5b8dfb",
    title: "v1",
    lines: ["12,000 frames", "s3://…/rain-v1"],
    at: 0.12,
  },
  {
    id: "v2",
    position: [-3.4, 0, 0.4],
    compact: [0, 0.6, 0],
    color: "#5b8dfb",
    title: "v2",
    lines: ["18,000 frames", "s3://…/rain-v2"],
    at: 0.2,
  },
  {
    id: "v3",
    position: [-3.4, -2.5, 0],
    compact: [2.1, 1.1, 0],
    color: "#5b8dfb",
    title: "v3",
    lines: ["24,000 frames", "s3://…/rain-v3"],
    at: 0.28,
  },
  {
    id: "genA",
    position: [-9.4, 2.8, -0.6],
    compact: [-2.1, -1.5, 0],
    color: "#37c9de",
    title: "GENERATION A",
    lines: ["seed 42", "→ v1"],
    at: 0.4,
  },
  {
    id: "genB",
    position: [-9.4, -2.8, -0.6],
    compact: [2.1, -1.5, 0],
    color: "#37c9de",
    title: "GENERATION B",
    lines: ["seed 19", "→ v3"],
    at: 0.48,
  },
  {
    id: "training",
    position: [1.4, 0.8, 0],
    compact: [0, -3.3, 0],
    color: "#d9a441",
    title: "TRAINING RUN",
    lines: ["inputs: v1 + v3", "YOLO · 50 epochs"],
    at: 0.62,
  },
  {
    id: "eval",
    position: [5.6, -1.2, 0],
    compact: [0, -5.6, 0],
    color: "#46b97e",
    title: "EVALUATION",
    lines: ["evaluated on v3", "mAP 0.724"],
    at: 0.78,
  },
];

const EDGES: Array<{ from: string; to: string; color: string; at: number }> = [
  { from: "root", to: "v1", color: "#5b8dfb", at: 0.12 },
  { from: "root", to: "v2", color: "#5b8dfb", at: 0.2 },
  { from: "root", to: "v3", color: "#5b8dfb", at: 0.28 },
  { from: "genA", to: "v1", color: "#37c9de", at: 0.42 },
  { from: "genB", to: "v3", color: "#37c9de", at: 0.5 },
  { from: "v1", to: "training", color: "#d9a441", at: 0.64 },
  { from: "v3", to: "training", color: "#d9a441", at: 0.68 },
  { from: "training", to: "eval", color: "#46b97e", at: 0.8 },
];

/**
 * Branching dataset history. Versions appear first, then the generations that
 * produced them, then the runs that consumed them — so the causal direction is
 * legible rather than merely decorative.
 */
export function DatasetVersionScene() {
  const isCompact = useIsCompact();
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: "-100px" });
  const progress = useMountProgress(2600, 0);
  const t = inView ? progress : 0;

  const positionOf = (id: string): Vec3 | null => {
    const node = NODES.find((candidate) => candidate.id === id);
    if (!node) return null;
    return isCompact ? node.compact : node.position;
  };

  return (
    <div ref={ref}>
      <SceneErrorBoundary>
        <SceneCanvas
          label="A logical dataset branching into versions v1, v2 and v3. Generation A produced v1, Generation B produced v3. A training run consumed v1 and v3; the evaluation was run on v3."
          className="h-[360px] w-full lg:h-[440px]"
          camera={{ position: isCompact ? [0, -1, 15] : [-1.4, 0, 15.5], fov: 42 }}
        >
          <CameraRig
            origin={isCompact ? [0, -1, 15] : [-1.4, 0, 15.5]}
            parallax={isCompact ? 0 : 0.5}
            drift={0.15}
          />

          {EDGES.map((edge) => {
            const from = positionOf(edge.from);
            const to = positionOf(edge.to);
            if (!from || !to) return null;
            const reveal = smoothstep(clamp((t - edge.at) / 0.16, 0, 1));
            if (reveal <= 0) return null;
            return (
              <GraphEdge
                key={`${edge.from}-${edge.to}`}
                from={from}
                to={to}
                color={edge.color}
                reveal={reveal}
                bow={0.12}
                state="idle"
              />
            );
          })}

          {NODES.map((node, index) => {
            const visible = t >= node.at;
            if (!visible) return null;
            return (
              <GraphNode
                key={node.id}
                position={isCompact ? node.compact : node.position}
                color={node.color}
                title={node.title}
                lines={node.lines}
                size={isCompact ? 0.22 : 0.25}
                phase={index * 1.3}
              />
            );
          })}
        </SceneCanvas>
      </SceneErrorBoundary>
    </div>
  );
}
