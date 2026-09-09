"use client";

import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { seededRandom } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import { SceneCanvas } from "./SceneCanvas";

/**
 * A dense block of frames standing in for the researcher's own storage.
 * It is deliberately heavy and static: the point of the scene is that these
 * bytes never move.
 */
function DataVolume({ position }: { position: [number, number, number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = useReducedMotion();
  const isCompact = useIsCompact();
  const count = isCompact ? 120 : 260;

  const matrices = useMemo(() => {
    const random = seededRandom(9021);
    const dummy = new THREE.Object3D();
    const list: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(
        (random() - 0.5) * 3.4,
        (random() - 0.5) * 2.6,
        (random() - 0.5) * 2.2,
      );
      dummy.rotation.set(0, random() * Math.PI, 0);
      const scale = 0.16 + random() * 0.1;
      dummy.scale.set(scale, scale * 0.72, scale * 0.05);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  useFrame((state) => {
    const instanced = mesh.current;
    if (!instanced) return;
    if (!instanced.userData.initialised) {
      matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
      instanced.instanceMatrix.needsUpdate = true;
      instanced.userData.initialised = true;
    }
    if (reducedMotion) return;
    instanced.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.18;
  });

  return (
    <group position={position}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#2b3547" transparent opacity={0.85} toneMapped={false} />
      </instancedMesh>

      <Billboard position={[0, 0, -1.6]}>
        <mesh raycast={() => null}>
          <planeGeometry args={[4.6, 3.6]} />
          <meshBasicMaterial color="#0f1420" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </Billboard>

      <Html center position={[0, -2.1, 0]} aria-hidden style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap text-center">
          <p className="font-mono text-[10px] tracking-[0.18em] text-ink-muted uppercase">
            Research storage
          </p>
          <p className="font-mono text-[10px] text-ink-dim">images · videos · datasets</p>
          <p className="font-mono text-[10px] text-ink-faint">potentially hundreds of GB</p>
        </div>
      </Html>
    </group>
  );
}

/**
 * Separates what SynthGraph holds (metadata, lineage, versions, references)
 * from what stays with the researcher (the data itself).
 */
export function StorageScene() {
  const isCompact = useIsCompact();
  const left: [number, number, number] = isCompact ? [0, 2.6, 0] : [-4.4, 0.6, 0];
  const right: [number, number, number] = isCompact ? [0, -2.4, 0] : [4.2, -0.4, 0];

  return (
    <SceneErrorBoundary>
      <SceneCanvas
        label="SynthGraph stores metadata, lineage, versions and references. It points at the researcher's own storage, where the dataset itself remains."
        className="h-[360px] w-full lg:h-[460px]"
        camera={{ position: [0, 0, isCompact ? 15 : 11], fov: 42 }}
      >
        <CameraRig origin={[0, 0, isCompact ? 15 : 11]} parallax={isCompact ? 0 : 0.5} drift={0.16} />

        <GraphNode
          position={left}
          color="#37c9de"
          title="SYNTHGRAPH"
          lines={["metadata · lineage", "versions · references"]}
          size={0.42}
        />

        <GraphEdge from={left} to={right} color="#37c9de" bow={0.1} width={1.3} state="active" />

        <Html
          center
          position={[
            (left[0] + right[0]) / 2,
            (left[1] + right[1]) / 2 + (isCompact ? 0.35 : 0.85),
            0,
          ]}
          aria-hidden
          style={{ pointerEvents: "none" }}
        >
          <span className="rounded border border-line bg-void/80 px-2 py-1 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-cyan uppercase">
            URI reference
          </span>
        </Html>

        <DataVolume position={right} />
      </SceneCanvas>
    </SceneErrorBoundary>
  );
}
