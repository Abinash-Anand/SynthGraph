export const SITE = {
  name: "SynthGraph",
  tagline: "Provenance for synthetic-data and simulation-driven research.",
  // Production falls back to the real domain, so a missing environment variable
  // can no longer put localhost URLs into the sitemap and robots.txt.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" ? "https://synthgraph.dev" : "http://localhost:3000"),
  github: "https://github.com/Abinash-Anand/SynthGraph",
  contactEmail: "contact@synthgraph.dev",
} as const;

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/research", label: "Use Cases" },
  { href: "/docs", label: "Docs" },
  { href: "/security", label: "Security" },
];

export const FOOTER_GROUPS: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "Product" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/research", label: "Use Cases" },
      { href: "/developers", label: "Developers" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/sdk/generations", label: "SDK guides" },
      { href: "/docs/cli/overview", label: "Command line" },
      { href: "/docs/reference/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/demo", label: "Contact" },
    ],
  },
];
