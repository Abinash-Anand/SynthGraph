"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { damp } from "@/lib/utils";

type CameraRigProps = {
  /** Base camera position; drift and parallax are applied around it. */
  origin?: [number, number, number];
  /** Amplitude of pointer parallax, in world units. */
  parallax?: number;
  /** Amplitude of the idle drift. Keep small — this must not induce nausea. */
  drift?: number;
  /** Optional focus target the camera eases toward. */
  target?: THREE.Vector3 | null;
  /** Additional Z offset, typically driven by scroll progress. */
  zoom?: number;
};

/**
 * Camera motion for every scene: slow idle drift, pointer parallax, and eased
 * focus transitions. All three collapse to a fixed camera under reduced motion.
 */
export function CameraRig({
  origin = [0, 0, 12],
  parallax = 0.9,
  drift = 0.28,
  target = null,
  zoom = 0,
}: CameraRigProps) {
  const { camera, size } = useThree();
  const reducedMotion = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    camera.position.set(origin[0], origin[1], origin[2] + zoom);
    camera.lookAt(0, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width]);

  useEffect(() => {
    if (reducedMotion) return;
    const onPointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reducedMotion]);

  /*
   * react-three-fiber's frame loop is imperative by design: the camera is a
   * long-lived scene object and every rig in every three.js codebase moves it
   * by mutation, outside React's render. The compiler lint rules below cannot
   * model that, and rewriting this to satisfy them would mean re-rendering the
   * React tree sixty times a second.
   */
  /* eslint-disable react-hooks/immutability */
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (reducedMotion) {
      camera.position.set(origin[0], origin[1], origin[2] + zoom);
      camera.lookAt(0, 0, 0);
      return;
    }

    const t = state.clock.elapsedTime;
    const driftX = Math.sin(t * 0.11) * drift;
    const driftY = Math.cos(t * 0.083) * drift * 0.6;

    const desiredX = origin[0] + driftX + pointer.current.x * parallax;
    const desiredY = origin[1] + driftY - pointer.current.y * parallax * 0.55;
    const desiredZ = origin[2] + zoom;

    camera.position.x = damp(camera.position.x, desiredX, 2.2, dt);
    camera.position.y = damp(camera.position.y, desiredY, 2.2, dt);
    camera.position.z = damp(camera.position.z, desiredZ, 2.6, dt);

    const focus = target ?? new THREE.Vector3(0, 0, 0);
    lookAt.current.x = damp(lookAt.current.x, focus.x, 3, dt);
    lookAt.current.y = damp(lookAt.current.y, focus.y, 3, dt);
    lookAt.current.z = damp(lookAt.current.z, focus.z, 3, dt);
    camera.lookAt(lookAt.current);
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}
