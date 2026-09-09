"use client";

import { Html, Line } from "@react-three/drei";
import { useState } from "react";
import { PARAMETER_POINTS } from "@/data/demo-data";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { remap } from "@/lib/utils";
import { SceneErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CameraRig } from "./CameraRig";
import { GraphNode } from "./GraphNode";
import { SceneCanvas } from "./SceneCanvas";

type Vec3 = [number, number, number];

const LIGHTING_Z: Record<string, number> = { clear: -2.6, rain: 0, fog: 1.6, night: 3.2 };

const ORIGIN: Vec3 = [-4, -3, -3];

/** Axis line with a label just beyond its far end. */
function Axis({ to, label, color, labelAt }: { to: Vec3; label: string; color: string; labelAt: Vec3 }) {
  return (
    <>
      <Line
        points={[ORIGIN, to]}
        color={color}
        lineWidth={1.2}
        transparent
        opacity={0.4}
        raycast={() => null}
      />
      <Html center position={labelAt} aria-hidden style={{ pointerEvents: "none" }}>
        <span
          className="whitespace-nowrap font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color }}
        >
          {label}
        </span>
      </Html>
    </>
  );
}

/**
 * The bounding box of the plotted range. Without it the points read as a
 * cloud rather than as positions in a space.
 */
function Frame() {
  const [x0, y0, z0] = ORIGIN;
  const [x1, y1, z1] = [4, 3, 3];
  const corners: Vec3[][] = [
    [[x0, y0, z0], [x1, y0, z0]], [[x0, y0, z1], [x1, y0, z1]],
    [[x0, y1, z0], [x1, y1, z0]], [[x0, y1, z1], [x1, y1, z1]],
    [[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]],
    [[x0, y0, z1], [x0, y1, z1]], [[x1, y0, z1], [x1, y1, z1]],
    [[x0, y0, z0], [x0, y0, z1]], [[x1, y0, z0], [x1, y0, z1]],
    [[x0, y1, z0], [x0, y1, z1]], [[x1, y1, z0], [x1, y1, z1]],
  ];
  return (
    <>
      {corners.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#2a3345"
          lineWidth={1}
          transparent
          opacity={0.4}
          raycast={() => null}
        />
      ))}
    </>
  );
}

/**
 * Experiments plotted in the parameter space they were run in.
 *
 * This is a way to *look at* recorded experiments — it does not search the
 * space, suggest points, or optimise anything.
 */
export function ParameterSpaceScene() {
  const isCompact = useIsCompact();
  const [hovered, setHovered] = useState<string | null>(null);
  const point = PARAMETER_POINTS.find((candidate) => candidate.id === hovered) ?? null;

  return (
    <div className="relative">
      <SceneErrorBoundary>
        <SceneCanvas
          label="Recorded experiments plotted against occlusion, camera distance and lighting condition. Hovering a point shows its parameters and evaluation metric."
          className="h-[380px] w-full lg:h-[460px]"
          camera={{ position: isCompact ? [7.5, 5, 14] : [8, 5, 11.5], fov: 42 }}
        >
          <CameraRig
            origin={isCompact ? [7.5, 5, 14] : [8, 5, 11.5]}
            parallax={isCompact ? 0 : 0.4}
            drift={0.2}
          />

          <Frame />
          <Axis to={[4, -3, -3]} labelAt={[5.4, -3.4, -3]} label="occlusion" color="#37c9de" />
          <Axis to={[-4, 3, -3]} labelAt={[-4.6, 4, -3]} label="camera distance" color="#5b8dfb" />
          <Axis to={[-4, -3, 3]} labelAt={[-4.6, -3.9, 3.6]} label="lighting" color="#a78bfa" />

          {PARAMETER_POINTS.map((experiment, index) => {
            const position: Vec3 = [
              remap(experiment.occlusion, 0.15, 0.55, -4, 4),
              remap(experiment.camera, 6, 19, -3, 3),
              LIGHTING_Z[experiment.lighting] ?? 0,
            ];
            // Metric drives brightness only. Nothing here implies causality.
            const strong = experiment.mAP > 0.73;
            return (
              <GraphNode
                key={experiment.id}
                position={position}
                color={strong ? "#46b97e" : "#5b8dfb"}
                size={0.18}
                phase={index * 1.1}
                showLabel={false}
                state={hovered ? (hovered === experiment.id ? "active" : "dim") : "idle"}
                onHover={() => setHovered(experiment.id)}
                onLeave={() => setHovered(null)}
                onSelect={() => setHovered(experiment.id)}
              />
            );
          })}
        </SceneCanvas>
      </SceneErrorBoundary>

      <div className="pointer-events-none absolute top-3 right-3 w-[210px] rounded-lg border border-line bg-surface/85 p-3 backdrop-blur-md">
        {point ? (
          <>
            <p className="font-mono text-[11px] text-ink">{point.id}</p>
            <dl className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
              {[
                ["occlusion", point.occlusion.toFixed(2)],
                ["camera", `${point.camera}m`],
                ["lighting", point.lighting],
                ["mAP", point.mAP.toFixed(3)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="font-mono text-[10px] text-ink-dim">{label}</dt>
                  <dd className="font-mono text-[10.5px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="font-mono text-[10.5px] leading-[1.7] text-ink-dim">
            Hover a point to read the experiment it stands for.
          </p>
        )}
      </div>
    </div>
  );
}
