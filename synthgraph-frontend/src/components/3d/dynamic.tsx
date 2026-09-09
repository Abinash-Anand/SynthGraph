"use client";

import dynamic from "next/dynamic";

/**
 * Every WebGL scene is loaded on the client only and code-split away from the
 * initial bundle. The placeholder reserves layout so nothing shifts when a
 * scene arrives.
 */
function placeholder(height: string) {
  return function Placeholder() {
    return <div className={height} aria-hidden />;
  };
}

export const HeroGraphScene = dynamic(
  () => import("./HeroGraphScene").then((mod) => mod.HeroGraphScene),
  { ssr: false, loading: placeholder("h-[420px] sm:h-[460px] lg:h-[500px]") },
);

export const LineageScene = dynamic(
  () => import("./LineageScene").then((mod) => mod.LineageScene),
  { ssr: false, loading: placeholder("h-[520px] lg:h-[620px]") },
);

export const StorageScene = dynamic(
  () => import("./StorageScene").then((mod) => mod.StorageScene),
  { ssr: false, loading: placeholder("h-[360px] lg:h-[460px]") },
);

export const DatasetVersionScene = dynamic(
  () => import("./DatasetVersionScene").then((mod) => mod.DatasetVersionScene),
  { ssr: false, loading: placeholder("h-[360px] lg:h-[440px]") },
);

export const AssetScene = dynamic(
  () => import("./AssetScene").then((mod) => mod.AssetScene),
  { ssr: false, loading: placeholder("h-[340px] lg:h-[420px]") },
);

export const ManifestScene = dynamic(
  () => import("./ManifestScene").then((mod) => mod.ManifestScene),
  { ssr: false, loading: placeholder("h-[320px] lg:h-[400px]") },
);

export const ConvergenceScene = dynamic(
  () => import("./ConvergenceScene").then((mod) => mod.ConvergenceScene),
  { ssr: false, loading: placeholder("h-[380px] lg:h-[480px]") },
);

export const AssemblyScene = dynamic(
  () => import("./AssemblyScene").then((mod) => mod.AssemblyScene),
  { ssr: false, loading: placeholder("h-full") },
);

export const StepGraphScene = dynamic(
  () => import("./StepGraphScene").then((mod) => mod.StepGraphScene),
  { ssr: false, loading: placeholder("h-[420px] lg:h-[500px]") },
);

export const ParameterSpaceScene = dynamic(
  () => import("./ParameterSpaceScene").then((mod) => mod.ParameterSpaceScene),
  { ssr: false, loading: placeholder("h-[380px] lg:h-[460px]") },
);

export const DemoGraphScene = dynamic(
  () => import("./DemoGraphScene").then((mod) => mod.DemoGraphScene),
  { ssr: false, loading: placeholder("h-[320px] lg:h-[440px]") },
);
