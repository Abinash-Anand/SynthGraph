import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SITE } from "@/data/site";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "SynthGraph — Provenance for synthetic-data research",
    template: "%s — SynthGraph",
  },
  description:
    "SynthGraph records where synthetic training data came from and what it trained: generator, seed and parameters, dataset versions, training runs and evaluations, linked into one graph. Open source.",
  keywords: [
    "synthetic data provenance",
    "synthetic data lineage",
    "experiment tracking",
    "domain randomization",
    "reinforcement learning experiments",
    "dataset versioning",
    "reproducibility",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "SynthGraph — Provenance for synthetic-data research",
    description:
      "Know exactly what produced your model. Generator, seed and parameters, dataset versions, training runs and evaluations, linked into one graph you can inspect later. Open source.",
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "SynthGraph — Provenance for synthetic-data research",
    description:
      "Know exactly what produced your model. Open source provenance for synthetic-data and simulation-driven research.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-[14px] focus:font-medium focus:text-void"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
