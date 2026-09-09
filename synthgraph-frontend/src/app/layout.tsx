import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";
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
    default: "SynthGraph — Synthetic Data Experiment Provenance",
    template: "%s — SynthGraph",
  },
  description:
    "SynthGraph helps computer-vision researchers track synthetic-data provenance, dataset versions, training lineage, and evaluation results so experiments are easier to reproduce and understand.",
  keywords: [
    "synthetic data provenance",
    "synthetic data experiment tracking",
    "computer vision research",
    "experiment lineage",
    "dataset versioning",
    "reproducible machine learning experiments",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "SynthGraph — Synthetic Data Experiment Provenance",
    description:
      "Provenance for synthetic-data experiments: generation parameters, dataset versions, training runs and evaluation results, connected into a reproducible research history.",
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "SynthGraph — Synthetic Data Experiment Provenance",
    description:
      "Provenance for synthetic-data experiments, built for computer-vision researchers.",
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
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
