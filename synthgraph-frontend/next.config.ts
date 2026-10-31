import createMDX from "@next/mdx";
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

// The documentation site (src/content/docs) is MDX. Pages are loaded with a
// dynamic import from the docs route, not file-based routing, so pageExtensions
// stays as it was. Plugins are named by string with serializable options,
// which is what Turbopack needs.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug", ["@shikijs/rehype", { theme: "github-dark", fallbackLanguage: "text" }]],
  },
});

export default withMDX(nextConfig);
