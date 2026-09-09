"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { clamp, remap, seededRandom, smoothstep } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import { ParticleFlow } from "./ParticleFlow";
import { SceneCanvas } from "./SceneCanvas";

type Vec3 = [number, number, number];

const TOOLS = [
  { id: "blender", label: "Blender", status: "supported" },
  { id: "unity", label: "Unity", status: "supported" },
  { id: "omniverse", label: "Omniverse", status: "supported" },
  { id: "python", label: "Custom Python", status: "supported" },
  { id: "cpp", label: "Custom C++", status: "supported" },
  { id: "pytorch", label: "PyTorch", status: "supported" },
  { id: "future", label: "Future tools", status: "planned" },
] as const;

/**
 * Many research environments resolving into one provenance model.
 *
 * Scroll drives the convergence: the tools start spread across an arc and are
 * drawn toward the canonical record as the section passes through the viewport.
 */
export function ConvergenceScene() {
  const isCompact = useIsCompact();
  const [ref, scroll] = useScrollProgress<HTMLDivElement>();

  // Only the middle of the section's travel drives the animation, so the
  // convergence completes while the section is actually on screen.
  const t = smoothstep(remap(scroll, 0.15, 0.72, 0, 1));

  const target: Vec3 = isCompact ? [0, -4.4, 0] : [4.4, 0, 0];

  /**
   * The tools start loose — staggered in x and scattered in depth — and
   * resolve into one evenly spaced column feeding the canonical record.
   * They keep their vertical separation throughout: convergence here means
   * "one shape", not "one point", and the labels have to stay readable.
   */
  const nodes = useMemo(() => {
    const random = seededRandom(2207);
    return TOOLS.map((tool, index) => {
      const share = TOOLS.length > 1 ? index / (TOOLS.length - 1) : 0.5;
      const jitterX = (random() - 0.5) * (isCompact ? 1.6 : 3.2);
      const jitterZ = (random() - 0.5) * 5;

      const looseX = (isCompact ? -2.6 : -3.6) + jitterX;
      const gatherX = isCompact ? -2.4 : -3.6;
      const spanY = isCompact ? 5.6 : 6.4;

      const position: Vec3 = [
        looseX + (gatherX - looseX) * t,
        (share - 0.5) * spanY,
        jitterZ * (1 - t),
      ];

      return { ...tool, position };
    });
  }, [t, isCompact]);

  const edgeReveal = smoothstep(clamp((t - 0.25) / 0.5, 0, 1));

  return (
    <div ref={ref}>
      <SceneErrorBoundary>
        <SceneCanvas
          label="Blender, Unity, Omniverse, custom Python, custom C++, PyTorch and future tools converging into one canonical SynthGraph provenance model."
          className="h-[380px] w-full lg:h-[480px]"
          camera={{ position: isCompact ? [0, -0.8, 14] : [0.4, 0, 10.4], fov: 42 }}
        >
          <CameraRig
            origin={isCompact ? [0, -0.8, 14] : [0.4, 0, 10.4]}
            parallax={isCompact ? 0 : 0.5}
            drift={0.16}
          />

          {edgeReveal > 0
            ? nodes.map((node) => (
                <GraphEdge
                  key={`edge-${node.id}`}
                  from={node.position}
                  to={target}
                  color={node.status === "planned" ? "#626d81" : "#37c9de"}
                  reveal={edgeReveal}
                  state={node.status === "planned" ? "dim" : "idle"}
                  bow={0.08}
                />
              ))
            : null}

          {edgeReveal > 0.5 ? (
            <ParticleFlow
              edges={nodes
                .filter((node) => node.status !== "planned")
                .map((node) => ({ from: node.position, to: target, color: "#37c9de", bow: 0.08 }))}
              perEdge={isCompact ? 2 : 4}
              size={0.06}
              speed={0.24}
            />
          ) : null}

          {nodes.map((node, index) => (
            <GraphNode
              key={node.id}
              position={node.position}
              color={node.status === "planned" ? "#626d81" : "#37c9de"}
              title={node.label}
              lines={node.status === "planned" ? ["roadmap"] : []}
              size={0.17}
              phase={index * 1.4}
              state={node.status === "planned" ? "dim" : "idle"}
            />
          ))}

          <GraphNode
            position={target}
            color="#5b8dfb"
            title="CANONICAL MODEL"
            lines={["Generation · DatasetVersion", "TrainingRun · EvaluationResult"]}
            size={0.42}
          />

          <Html
            center
            position={[target[0], target[1] + (isCompact ? 1.5 : 1.9), target[2]]}
            aria-hidden
            style={{ pointerEvents: "none" }}
          >
            <span
              className="rounded border border-line bg-void/80 px-2 py-1 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-ink-dim uppercase transition-opacity duration-500"
              style={{ opacity: t }}
            >
              one provenance model
            </span>
          </Html>
        </SceneCanvas>
      </SceneErrorBoundary>
    </div>
  );
}
