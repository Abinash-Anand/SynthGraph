"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { seededRandom } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { SceneCanvas } from "./SceneCanvas";

const ACCENT = "#a78bfa";

/**
 * A procedurally built stand-in for a scene asset. No external models ship
 * with this site — the geometry is assembled from primitives so successive
 * "versions" can differ visibly without licensing anything.
 */
function AssetProxy({
  detail,
  highlighted,
  seed,
}: {
  detail: number;
  highlighted: boolean;
  seed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const reducedMotion = useReducedMotion();

  const parts = useMemo(() => {
    const random = seededRandom(seed);
    const list: Array<{ position: [number, number, number]; scale: [number, number, number] }> = [
      { position: [0, 0, 0], scale: [1.5, 0.42, 0.72] },
      { position: [-0.12, 0.36, 0], scale: [0.86, 0.34, 0.62] },
    ];
    // Later versions carry more modelled detail.
    for (let i = 0; i < detail; i += 1) {
      list.push({
        position: [(random() - 0.5) * 1.3, 0.1 + random() * 0.4, (random() - 0.5) * 0.6],
        scale: [0.12 + random() * 0.2, 0.08 + random() * 0.14, 0.1 + random() * 0.3],
      });
    }
    return list;
  }, [detail, seed]);

  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += delta * (highlighted ? 0.34 : 0.16);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6 + seed) * 0.06;
  });

  const color = highlighted ? ACCENT : "#59647a";

  return (
    <group ref={group}>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} scale={part.scale} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={highlighted ? 0.9 : 0.4} />
        </mesh>
      ))}
      {/* Wheels — four cylinders, always present. */}
      {[
        [-0.5, -0.26, 0.36],
        [0.5, -0.26, 0.36],
        [-0.5, -0.26, -0.36],
        [0.5, -0.26, -0.36],
      ].map((position, index) => (
        <mesh
          key={`wheel-${index}`}
          position={position as [number, number, number]}
          rotation={[Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <cylinderGeometry args={[0.17, 0.17, 0.12, 12]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={highlighted ? 0.7 : 0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** Procedural texture swatch, drawn to a canvas at mount and disposed after. */
function TextureSwatch({ cells, highlighted, seed }: { cells: number; highlighted: boolean; seed: number }) {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const random = seededRandom(seed);
      ctx.fillStyle = "#131720";
      ctx.fillRect(0, 0, size, size);
      const step = size / cells;
      for (let x = 0; x < cells; x += 1) {
        for (let y = 0; y < cells; y += 1) {
          const value = random();
          ctx.fillStyle = `rgba(167,139,250,${0.06 + value * 0.36})`;
          ctx.fillRect(x * step, y * step, step - 0.5, step - 0.5);
        }
      }
    }
    const created = new THREE.CanvasTexture(canvas);
    created.colorSpace = THREE.SRGBColorSpace;
    return created;
  }, [cells, seed]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh raycast={() => null} rotation={[0, -0.35, 0]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={highlighted ? 1 : 0.45}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

type AssetSlot = {
  id: string;
  label: string;
  version: string;
  position: [number, number, number];
  compact: [number, number, number];
  used: boolean;
  kind: "model" | "texture";
  detail: number;
};

const SLOTS: AssetSlot[] = [
  { id: "m1", label: "vehicle-model", version: "v1", position: [-4.6, 1.5, 0], compact: [-2.4, 2.1, 0], used: false, kind: "model", detail: 0 },
  { id: "m2", label: "vehicle-model", version: "v2", position: [-1.5, 1.5, 0], compact: [0, 2.1, 0], used: false, kind: "model", detail: 2 },
  { id: "m7", label: "vehicle-model", version: "v7", position: [1.6, 1.5, 0], compact: [2.4, 2.1, 0], used: true, kind: "model", detail: 6 },
  { id: "t1", label: "forest-texture", version: "v1", position: [-3.1, -1.9, 0], compact: [-1.4, -1.8, 0], used: false, kind: "texture", detail: 4 },
  { id: "t4", label: "forest-texture", version: "v4", position: [0.1, -1.9, 0], compact: [1.4, -1.8, 0], used: true, kind: "texture", detail: 12 },
];

/**
 * Asset version shelf. The version a generation actually referenced is lit;
 * the rest of the history stays visible but recessive.
 */
export function AssetScene() {
  const isCompact = useIsCompact();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <SceneErrorBoundary>
      <SceneCanvas
        label="Asset versions. vehicle-model has versions v1, v2 and v7; forest-texture has v1 and v4. The generation referenced vehicle-model v7 and forest-texture v4."
        className="h-[340px] w-full lg:h-[420px]"
        camera={{ position: isCompact ? [0, 0, 12] : [-1.4, 0, 10.5], fov: 42 }}
      >
        <CameraRig
          origin={isCompact ? [0, 0, 12] : [-1.4, 0, 10.5]}
          parallax={isCompact ? 0 : 0.45}
          drift={0.14}
        />

        {SLOTS.map((slot) => {
          const position = isCompact ? slot.compact : slot.position;
          const active = slot.used || hovered === slot.id;
          return (
            <group key={slot.id} position={position} scale={isCompact ? 0.72 : 1}>
              <mesh
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setHovered(slot.id);
                }}
                onPointerOut={() => setHovered(null)}
              >
                <boxGeometry args={[2.4, 2, 1.6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {slot.kind === "model" ? (
                <AssetProxy detail={slot.detail} highlighted={active} seed={slot.detail + 7} />
              ) : (
                <TextureSwatch cells={slot.detail} highlighted={active} seed={slot.detail + 31} />
              )}

              <Html center position={[0, -1.15, 0]} aria-hidden style={{ pointerEvents: "none" }}>
                <div className="whitespace-nowrap text-center">
                  <p
                    className="font-mono text-[10px] tracking-[0.12em]"
                    style={{ color: active ? ACCENT : "#626d81" }}
                  >
                    {slot.label}:{slot.version}
                  </p>
                  {slot.used ? (
                    <p className="font-mono text-[9px] tracking-[0.14em] text-ink-dim uppercase">
                      referenced
                    </p>
                  ) : null}
                </div>
              </Html>
            </group>
          );
        })}
      </SceneCanvas>
    </SceneErrorBoundary>
  );
}
