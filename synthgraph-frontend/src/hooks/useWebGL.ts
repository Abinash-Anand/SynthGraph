"use client";

import { useSyncExternalStore } from "react";

export type WebGLStatus = "probing" | "available" | "unavailable";

let cached: WebGLStatus | null = null;

function probe(): WebGLStatus {
  if (cached) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cached = gl ? "available" : "unavailable";
    // Release the probe context immediately; browsers cap live contexts.
    const lose = (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  } catch {
    cached = "unavailable";
  }
  return cached;
}

/** Capability, not state: the result never changes, so nothing to subscribe to. */
const subscribe = () => () => {};
const getServerSnapshot = (): WebGLStatus => "probing";

/** Reports whether WebGL can be used. Every scene has a non-WebGL fallback. */
export function useWebGL(): WebGLStatus {
  return useSyncExternalStore(subscribe, probe, getServerSnapshot);
}
