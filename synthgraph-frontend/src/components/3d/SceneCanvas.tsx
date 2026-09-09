"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useInView } from "@/hooks/useInView";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWebGL } from "@/hooks/useWebGL";
import { cn } from "@/lib/utils";

type SceneCanvasProps = {
  children: ReactNode;
  /**
   * Rendered instead of the canvas when WebGL is unavailable. Every scene on
   * this site also has real text next to it, so this is a visual courtesy —
   * never the only route to the information.
   */
  fallback?: ReactNode;
  /** Describes the scene for assistive technology. */
  label: string;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  /** Render continuously, or only when something invalidates. */
  continuous?: boolean;
  dprMax?: number;
};

/**
 * The single entry point for every WebGL scene on the site.
 *
 * It owns the concerns that are easy to get wrong once per scene:
 *   - nothing mounts until the section is near the viewport
 *   - the render loop stops the moment the section leaves it
 *   - device pixel ratio is capped, harder on small screens
 *   - reduced-motion visitors get a single static frame
 *   - GPU resources are released on unmount
 */
export function SceneCanvas({
  children,
  fallback,
  label,
  className,
  camera = { position: [0, 0, 12], fov: 40 },
  continuous = true,
  dprMax = 1.75,
}: SceneCanvasProps) {
  const [ref, inView, mounted] = useInView<HTMLDivElement>({ rootMargin: "300px 0px" });
  const reducedMotion = useReducedMotion();
  const isCompact = useIsCompact();
  const webgl = useWebGL();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Release the GL context deliberately rather than waiting for GC.
  useEffect(() => {
    return () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderer.dispose();
      renderer.forceContextLoss();
      rendererRef.current = null;
    };
  }, []);

  const showFallback = webgl === "unavailable";
  const frameloop = reducedMotion || !continuous ? "demand" : inView ? "always" : "never";

  return (
    /* The scene is announced as a single labelled image. Everything inside it
       — canvas, DOM labels — is decorative duplication of text that appears
       next to it in the page. */
    <div
      ref={ref}
      className={cn("relative", className)}
      role="img"
      aria-label={label}
    >
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center">{fallback}</div>
      ) : mounted ? (
        <Canvas
          aria-hidden
          camera={{ ...camera, fov: camera.fov ?? 40 }}
          dpr={[1, isCompact ? Math.min(dprMax, 1.5) : dprMax]}
          frameloop={frameloop}
          gl={{
            antialias: !isCompact,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            rendererRef.current = gl;
            gl.setClearColor(0x000000, 0);
          }}
          className="!absolute inset-0"
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      ) : (
        <div className="absolute inset-0" aria-hidden />
      )}
    </div>
  );
}
