import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Vercel's own build pipeline doesn't support `output: "standalone"` —
  // it expects the default .next server-trace output (e.g.
  // next-server.js.nft.json) and fails its post-build step without it.
  // Standalone output is only needed for the self-hosted Docker build,
  // where the VERCEL env var (set automatically by Vercel's build/runtime
  // environment) is never present.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
