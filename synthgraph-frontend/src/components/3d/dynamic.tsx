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

export const DemoGraphScene = dynamic(
  () => import("./DemoGraphScene").then((mod) => mod.DemoGraphScene),
  { ssr: false, loading: placeholder("h-[320px] lg:h-[440px]") },
);
