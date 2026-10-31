import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";

// Each page's canonical URL is its own path, resolved against the site's base URL.
export const metadata: Metadata = { alternates: { canonical: "./" } };

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
