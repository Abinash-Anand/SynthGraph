"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { provenanceCurve } from "@/lib/three-helpers";
import { damp } from "@/lib/utils";

export type EdgeVisualState = "idle" | "active" | "dim";

type LineRef = THREE.Object3D & {
  material: THREE.Material & { opacity: number; linewidth: number };
};

type GraphEdgeProps = {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  state?: EdgeVisualState;
  bow?: number;
  width?: number;
  /** 0 → 1. Below 1 the arc is drawn partially, for assembly animations. */
  reveal?: number;
};

const STATE_OPACITY: Record<EdgeVisualState, number> = {
  idle: 0.46,
  active: 0.95,
  dim: 0.09,
};

const SEGMENTS = 44;

/** A single provenance relationship, drawn as a gentle arc. */
export function GraphEdge({
  from,
  to,
  color = "#5b8dfb",
  state = "idle",
  bow = 0.16,
  width = 1.3,
  reveal = 1,
}: GraphEdgeProps) {
  const lineRef = useRef<LineRef>(null);
  const curve = useMemo(() => provenanceCurve(from, to, bow), [from, to, bow]);

  const points = useMemo(() => {
    const span = Math.max(reveal, 0.02);
    return Array.from({ length: SEGMENTS }, (_, index) =>
      curve.getPoint((index / (SEGMENTS - 1)) * span),
    );
  }, [curve, reveal]);

  useFrame((_, delta) => {
    const line = lineRef.current;
    if (!line) return;
    const dt = Math.min(delta, 0.05);
    line.material.opacity = damp(line.material.opacity, STATE_OPACITY[state], 8, dt);
    line.material.linewidth = damp(
      line.material.linewidth,
      state === "active" ? width * 1.9 : width,
      8,
      dt,
    );
  });

  return (
    <Line
      ref={lineRef as never}
      points={points}
      color={color}
      lineWidth={width}
      transparent
      opacity={STATE_OPACITY[state]}
      toneMapped={false}
      raycast={() => null}
    />
  );
}
