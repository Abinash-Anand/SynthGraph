"use client";

import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getGlowTexture } from "@/lib/three-helpers";
import { damp } from "@/lib/utils";

export type NodeVisualState = "idle" | "active" | "dim";

type GraphNodeProps = {
  position: [number, number, number];
  color: string;
  /** Short in-scene caption, e.g. "GENERATION". */
  title?: string;
  /** Up to two supporting lines under the title. */
  lines?: readonly string[];
  state?: NodeVisualState;
  size?: number;
  /** Phase offset so a field of nodes does not pulse in unison. */
  phase?: number;
  onHover?: () => void;
  onLeave?: () => void;
  onSelect?: () => void;
  showLabel?: boolean;
};

const STATE_OPACITY: Record<NodeVisualState, number> = {
  idle: 0.82,
  active: 1,
  dim: 0.2,
};

const STATE_SCALE: Record<NodeVisualState, number> = {
  idle: 1,
  active: 1.28,
  dim: 0.88,
};

/**
 * One record in the provenance graph. The mesh carries the interaction; the
 * label is DOM so it stays crisp and inherits the site's typography.
 */
export function GraphNode({
  position,
  color,
  title,
  lines,
  state = "idle",
  size = 0.3,
  phase = 0,
  onHover,
  onLeave,
  onSelect,
  showLabel = true,
}: GraphNodeProps) {
  const group = useRef<THREE.Group>(null);
  const coreMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const glowMaterial = useRef<THREE.SpriteMaterial>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const glow = useMemo(() => getGlowTexture(), []);
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame((frameState, delta) => {
    const dt = Math.min(delta, 0.05);
    const targetScale = STATE_SCALE[state];
    const targetOpacity = STATE_OPACITY[state];

    // A slow breath keeps the graph feeling live without drawing attention.
    const breath = reducedMotion
      ? 0
      : Math.sin(frameState.clock.elapsedTime * 0.9 + phase) * 0.035;

    if (group.current) {
      const next = damp(group.current.scale.x, targetScale + breath, 6, dt);
      group.current.scale.setScalar(next);
    }
    if (coreMaterial.current) {
      coreMaterial.current.opacity = damp(coreMaterial.current.opacity, targetOpacity, 8, dt);
    }
    if (glowMaterial.current) {
      const glowTarget = state === "active" ? 0.55 : state === "dim" ? 0.06 : 0.22;
      glowMaterial.current.opacity = damp(glowMaterial.current.opacity, glowTarget, 8, dt);
    }
    if (ringMaterial.current) {
      const ringTarget = state === "active" ? 0.9 : state === "dim" ? 0.08 : 0.3;
      ringMaterial.current.opacity = damp(ringMaterial.current.opacity, ringTarget, 8, dt);
    }
  });

  const enter = () => {
    setHovered(true);
    onHover?.();
    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
  };

  const leave = () => {
    setHovered(false);
    onLeave?.();
    if (typeof document !== "undefined") document.body.style.cursor = "";
  };

  return (
    <group position={position}>
      <group ref={group}>
        {/* Generous invisible hit area — small nodes are hard to hover. */}
        <mesh
          onPointerOver={(event) => {
            event.stopPropagation();
            enter();
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            leave();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
        >
          <sphereGeometry args={[size * 3.2, 12, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh raycast={() => null}>
          <icosahedronGeometry args={[size, 1]} />
          <meshBasicMaterial
            ref={coreMaterial}
            color={threeColor}
            transparent
            opacity={STATE_OPACITY[state]}
            toneMapped={false}
          />
        </mesh>

        <Billboard>
          <mesh raycast={() => null}>
            <ringGeometry args={[size * 1.9, size * 2.02, 48]} />
            <meshBasicMaterial
              ref={ringMaterial}
              color={threeColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </Billboard>

        <sprite scale={[size * 11, size * 11, 1]} raycast={() => null}>
          <spriteMaterial
            ref={glowMaterial}
            map={glow}
            color={threeColor}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>

      {showLabel && title ? (
        <Html
          position={[0, -size * 4.4, 0]}
          center
          zIndexRange={[20, 0]}
          /* Duplicated in real text beside every scene, so hide from AT. */
          aria-hidden
          style={{ pointerEvents: "none" }}
        >
          <div
            className="select-none whitespace-nowrap text-center transition-opacity duration-300"
            style={{ opacity: state === "dim" ? 0.25 : 1 }}
          >
            <div
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: state === "idle" && !hovered ? "#9aa4b6" : color }}
            >
              {title}
            </div>
            {lines?.map((line) => (
              <div key={line} className="font-mono text-[10px] text-ink-dim leading-[1.5]">
                {line}
              </div>
            ))}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
