"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getDotTexture, provenanceCurve } from "@/lib/three-helpers";
import { seededRandom } from "@/lib/utils";

export type FlowEdge = {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  bow?: number;
  /** Dimmed edges carry dimmed particles. */
  intensity?: number;
};

type ParticleFlowProps = {
  edges: FlowEdge[];
  /** Particles per edge. Lower this on small screens. */
  perEdge?: number;
  speed?: number;
  size?: number;
  seed?: number;
};

/**
 * Particles travelling along provenance edges.
 *
 * These represent a *relationship* between records — not the movement of
 * dataset bytes. One THREE.Points object covers every edge in the scene so a
 * graph costs a single draw call regardless of edge count.
 */
export function ParticleFlow({
  edges,
  perEdge = 5,
  speed = 0.16,
  size = 0.085,
  seed = 1337,
}: ParticleFlowProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const reducedMotion = useReducedMotion();
  const texture = useMemo(() => getDotTexture(), []);

  const { geometry, curves, offsets, edgeIndex } = useMemo(() => {
    const random = seededRandom(seed);
    const built = edges.map((edge) => provenanceCurve(edge.from, edge.to, edge.bow ?? 0.16));
    const total = built.length * perEdge;

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const phases = new Float32Array(total);
    const owners = new Int32Array(total);
    const color = new THREE.Color();

    let cursor = 0;
    edges.forEach((edge, edgeIdx) => {
      color.set(edge.color);
      for (let i = 0; i < perEdge; i += 1) {
        // Evenly spaced with a small deterministic jitter so the flow reads
        // as continuous rather than as a marching grid.
        phases[cursor] = (i / perEdge + random() * 0.06) % 1;
        owners[cursor] = edgeIdx;
        colors[cursor * 3] = color.r;
        colors[cursor * 3 + 1] = color.g;
        colors[cursor * 3 + 2] = color.b;
        cursor += 1;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return { geometry: geo, curves: built, offsets: phases, edgeIndex: owners };
  }, [edges, perEdge, seed]);

  // Position particles once immediately so a static (reduced-motion) render
  // still shows the relationship, rather than a cluster at the origin.
  useEffect(() => {
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const point = new THREE.Vector3();
    for (let i = 0; i < offsets.length; i += 1) {
      const curve = curves[edgeIndex[i]];
      if (!curve) continue;
      curve.getPoint(offsets[i], point);
      attribute.setXYZ(i, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
  }, [geometry, curves, offsets, edgeIndex]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    if (reducedMotion) return;
    const points = pointsRef.current;
    if (!points) return;

    const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const elapsed = state.clock.elapsedTime * speed;
    const point = new THREE.Vector3();

    for (let i = 0; i < offsets.length; i += 1) {
      const curve = curves[edgeIndex[i]];
      if (!curve) continue;
      const t = (offsets[i] + elapsed) % 1;
      curve.getPoint(t, point);
      attribute.setXYZ(i, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} raycast={() => null}>
      <pointsMaterial
        size={size}
        map={texture}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
