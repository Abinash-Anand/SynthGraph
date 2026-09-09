export const SITE = {
  name: "SynthGraph",
  tagline: "Synthetic-data provenance for computer-vision research.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Update when a public repository / docs site actually exists. */
  github: null as string | null,
  docs: null as string | null,
  contactEmail: "hello@synthgraph.dev",
} as const;

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/research", label: "For Researchers" },
  { href: "/developers", label: "Developers" },
  { href: "/security", label: "Security" },
];

export const FOOTER_GROUPS: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "Product" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/research", label: "For Researchers" },
      { href: "/developers", label: "Developers" },
      { href: "/security", label: "Security" },
      { href: "/demo", label: "Request a Demo" },
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
