"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { LINEAGE_EDGES, LINEAGE_NODES } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { clamp, remap, seededRandom, smoothstep } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphFallback } from "./GraphFallback";
import { ProvenanceGraph } from "./ProvenanceGraph";
import { SceneCanvas } from "./SceneCanvas";

const FRAGMENT_LABELS = ["code", "asset", "generator", "dataset", "metrics", "notes"];

/**
 * The scattered research artefacts the section opens with: loose fragments
 * with no relationship to each other. They drift toward the records they
 * belong to and fade out as the structured graph takes over.
 */
function Fragments({ progress, count }: { progress: number; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const reducedMotion = useReducedMotion();

  const seeds = useMemo(() => {
    const random = seededRandom(4711);
    return Array.from({ length: count }, () => ({
      from: new THREE.Vector3(
        (random() - 0.5) * 20,
        (random() - 0.5) * 11,
        (random() - 0.5) * 9,
      ),
      to: new THREE.Vector3(
        ...(LINEAGE_NODES[Math.floor(random() * LINEAGE_NODES.length)]?.position ?? [0, 0, 0]),
      ),
      scale: 0.08 + random() * 0.12,
      spin: random() * Math.PI * 2,
    }));
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const instanced = mesh.current;
    if (!instanced) return;

    const gather = smoothstep(remap(progress, 0.12, 0.5, 0, 1));
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    seeds.forEach((seed, index) => {
      dummy.position.lerpVectors(seed.from, seed.to, gather);
      dummy.rotation.set(seed.spin + t * 0.12, seed.spin * 1.4 + t * 0.09, 0);
      const scale = seed.scale * (1 - gather * 0.65);
      dummy.scale.setScalar(Math.max(scale, 0.001));
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;

    if (material.current) {
      material.current.opacity = clamp(0.7 - gather * 0.7, 0, 0.7);
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={material}
        color="#4a5568"
        transparent
        opacity={0.7}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/**
 * The homepage's signature sequence.
 *
 * One scroll gesture carries the whole argument: scattered artefacts become
 * structured records, records gain relationships, relationships become a
 * lineage, and the lineage yields a reproduction manifest.
 */
export function AssemblyScene({ progress }: { progress: number }) {
  const isCompact = useIsCompact();

  const assembly = smoothstep(remap(progress, 0.16, 0.62, 0, 1));
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
  const manifestOpacity = clamp(remap(progress, 0.76, 0.94, 0, 1), 0, 1);
  const fragmentsVisible = progress < 0.62;

  return (
    <SceneErrorBoundary fallback={<GraphFallback />}>
      <SceneCanvas
        label="Scattered research artefacts assembling into structured records, then into a provenance lineage, then into a reproduction manifest."
        className="h-full w-full"
        camera={{ position: isCompact ? [0, -1.8, 13] : [0, 0, 14], fov: 44 }}
        fallback={<GraphFallback />}
      >
        <CameraRig
          origin={isCompact ? [0, -1.8, 13] : [0, 0, 14]}
          parallax={isCompact ? 0 : 0.5}
          drift={0.18}
          zoom={isCompact ? remap(progress, 0, 1, 1.2, -0.4) : remap(progress, 0, 1, 2.2, -0.8)}
        />

        {/* Held to the right of the viewport so the copy column stays clear. */}
        <group position={[isCompact ? 0 : 2.6, isCompact ? -1.4 : 0, 0]}>
          {fragmentsVisible ? <Fragments progress={progress} count={isCompact ? 40 : 90} /> : null}

          <ProvenanceGraph
            nodes={nodes}
            edges={edges}
            assembly={assembly}
            particles={progress > 0.6}
            scale={isCompact ? 1 : 0.92}
          />
        </group>

        {manifestOpacity > 0.01 ? (
          <Html center position={[isCompact ? 0 : 2.6, isCompact ? -1.4 : 0, 4]} aria-hidden style={{ pointerEvents: "none" }}>
            <div
              className="w-[240px] rounded-lg border border-cyan/30 bg-void/85 p-4 backdrop-blur-sm transition-opacity duration-300"
              style={{ opacity: manifestOpacity }}
            >
              <p className="font-mono text-[9px] tracking-[0.18em] text-cyan uppercase">
                Reproduction manifest
              </p>
              <p className="mt-2 font-mono text-[10px] leading-[1.7] text-ink-dim">
                generator · parameters · seed
                <br />
                assets · dataset reference
                <br />
                code version · known gaps
              </p>
            </div>
          </Html>
        ) : null}
      </SceneCanvas>
    </SceneErrorBoundary>
  );
}

export { FRAGMENT_LABELS };
