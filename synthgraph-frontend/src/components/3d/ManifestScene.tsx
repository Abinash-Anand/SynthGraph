"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useInView } from "@/hooks/useInView";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useMountProgress } from "@/hooks/useMountProgress";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getGlowTexture } from "@/lib/three-helpers";
import { clamp, damp, smoothstep } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import { ParticleFlow } from "./ParticleFlow";
import { SceneCanvas } from "./SceneCanvas";

type Vec3 = [number, number, number];

const SOURCES: Array<{
  id: string;
  position: Vec3;
  compact: Vec3;
  color: string;
  title: string;
  lines: [string, string];
  known: boolean;
}> = [
  {
    id: "generation",
    position: [-4.8, 2.6, 0],
    compact: [-2.5, 3.1, 0],
    color: "#37c9de",
    title: "GENERATION",
    lines: ["blender 4.2.0", "seed 42"],
    known: true,
  },
  {
    id: "assets",
    position: [-5.4, 0.1, 0],
    compact: [2.5, 3.1, 0],
    color: "#a78bfa",
    title: "ASSETS",
    lines: ["vehicle-model:v7", "forest-texture:v4"],
    known: true,
  },
  {
    id: "dataset",
    position: [-4.8, -2.5, 0],
    compact: [-2.5, 1.1, 0],
    color: "#5b8dfb",
    title: "DATASET",
    lines: ["rain_dataset:v7", "s3://research/rain-v7"],
    known: true,
  },
  {
    id: "code",
    position: [-2.0, 4.0, 0],
    compact: [2.5, 1.1, 0],
    color: "#7f8ea8",
    title: "CODE",
    lines: ["commit 8f3a2b1", "branch rain-sweep"],
    known: true,
  },
  {
    id: "environment",
    position: [-1.5, -3.6, 0],
    compact: [0, -3.4, 0],
    color: "#d9a441",
    title: "CUDA ENVIRONMENT",
    lines: ["external", "not recorded"],
    known: false,
  },
];

/** The manifest itself: a card that firms up as the evidence lands on it. */
function ManifestPlate({ progress, compact }: { progress: number; compact: boolean }) {
  const glowMaterial = useRef<THREE.SpriteMaterial>(null);
  const glow = useMemo(() => getGlowTexture(), []);
  const reducedMotion = useReducedMotion();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (glowMaterial.current) {
      const pulse = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
      glowMaterial.current.opacity = damp(
        glowMaterial.current.opacity,
        0.1 + progress * 0.24 + pulse,
        5,
        dt,
      );
    }
  });

  return (
    <group position={compact ? [0, -0.8, 0] : [3.6, 0, 0]}>
      <sprite scale={[9, 8, 1]} raycast={() => null}>
        <spriteMaterial
          ref={glowMaterial}
          map={glow}
          color="#37c9de"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      <Html center aria-hidden style={{ pointerEvents: "none" }}>
        <div
          className="w-[214px] rounded-lg border border-cyan/30 bg-void/85 p-3.5 text-left backdrop-blur-sm transition-opacity duration-500"
          style={{ opacity: clamp(progress * 1.4, 0, 1) }}
        >
          <p className="font-mono text-[9px] tracking-[0.18em] text-cyan uppercase">
            Reproduction manifest
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {SOURCES.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-ink-dim">
                  {source.title.toLowerCase()}
                </span>
                <span
                  className="font-mono text-[9px] tracking-[0.1em] uppercase"
                  style={{ color: source.known ? "#46b97e" : "#d9a441" }}
                >
                  {source.known ? "recorded" : "missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Html>
    </group>
  );
}

/**
 * Evidence gathering into a manifest. The missing dependency is drawn in amber
 * and stays outside the plate — the manifest states what is not known as
 * plainly as what is.
 */
export function ManifestScene() {
  const isCompact = useIsCompact();
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: "-100px" });
  const raw = useMountProgress(2400, 100);
  const progress = inView ? raw : 0;

  const target: Vec3 = isCompact ? [0, -0.8, 0] : [3.6, 0, 0];

  return (
    <div ref={ref}>
      <SceneErrorBoundary>
        <SceneCanvas
          label="A reproduction manifest assembling from the recorded generation, assets, dataset reference and code version. The external CUDA environment is marked as missing rather than assumed."
          className="h-[320px] w-full lg:h-[400px]"
          camera={{ position: isCompact ? [0, 0, 15] : [0, 0, 14], fov: 42 }}
        >
          <CameraRig
            origin={isCompact ? [0, 0, 15] : [0, 0, 14]}
            parallax={isCompact ? 0 : 0.45}
            drift={0.14}
          />

          {SOURCES.map((source) => {
            const from = isCompact ? source.compact : source.position;
            const reveal = smoothstep(clamp((progress - 0.15) / 0.5, 0, 1));
            return (
              <GraphEdge
                key={`edge-${source.id}`}
                from={from}
                to={target}
                color={source.known ? "#37c9de" : "#d9a441"}
                reveal={source.known ? reveal : reveal * 0.55}
                state={source.known ? "idle" : "dim"}
                bow={0.1}
              />
            );
          })}

          <ParticleFlow
            edges={SOURCES.filter((source) => source.known).map((source) => ({
              from: isCompact ? source.compact : source.position,
              to: target,
              color: source.color,
              bow: 0.1,
            }))}
            perEdge={isCompact ? 2 : 4}
            size={0.07}
            speed={0.22}
          />

          {SOURCES.map((source, index) => (
            <GraphNode
              key={source.id}
              position={isCompact ? source.compact : source.position}
              color={source.color}
              title={source.title}
              lines={source.lines}
              size={0.22}
              phase={index * 1.9}
              state={source.known ? "idle" : "dim"}
            />
          ))}

          <ManifestPlate progress={progress} compact={isCompact} />
        </SceneCanvas>
      </SceneErrorBoundary>
    </div>
  );
}
