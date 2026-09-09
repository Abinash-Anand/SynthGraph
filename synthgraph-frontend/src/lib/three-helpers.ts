import * as THREE from "three";

/**
 * Radial-gradient sprite texture, generated once and shared. Used for node
 * glows and flow particles so no image assets ship with the site.
 */
let glowTexture: THREE.Texture | null = null;

export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  glowTexture = texture;
  return texture;
}

/** Hard-edged circular sprite, for particles that should read as dots. */
let dotTexture: THREE.Texture | null = null;

export function getDotTexture(): THREE.Texture {
  if (dotTexture) return dotTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.25)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  dotTexture = texture;
  return texture;
}

/**
 * Provenance edges are drawn as gentle arcs rather than straight lines so
 * overlapping relationships stay separable.
 */
export function provenanceCurve(
  from: THREE.Vector3 | [number, number, number],
  to: THREE.Vector3 | [number, number, number],
  bow = 0.18,
): THREE.QuadraticBezierCurve3 {
  const a = Array.isArray(from) ? new THREE.Vector3(...from) : from;
  const b = Array.isArray(to) ? new THREE.Vector3(...to) : to;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const delta = b.clone().sub(a);
  // Perpendicular in the XY plane, scaled by span, keeps arcs consistent.
  const perpendicular = new THREE.Vector3(-delta.y, delta.x, 0).normalize();
  if (perpendicular.lengthSq() === 0) perpendicular.set(0, 1, 0);
  mid.addScaledVector(perpendicular, delta.length() * bow);
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

/** Disposes a texture cache entry; called from a module-level cleanup. */
export function disposeSharedTextures(): void {
  glowTexture?.dispose();
  dotTexture?.dispose();
  glowTexture = null;
  dotTexture = null;
}
