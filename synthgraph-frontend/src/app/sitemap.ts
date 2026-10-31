import type { MetadataRoute } from "next";
import { allDocPages } from "@/content/docs/nav";
import { SITE } from "@/data/site";

const MARKETING_ROUTES = ["", "/product", "/how-it-works", "/research", "/developers", "/security", "/about", "/demo"];

// No lastModified: the pages are built from source, so "now" on every request
// would say something false about when they changed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...MARKETING_ROUTES.map((route) => ({
      url: `${SITE.url}${route}`,
      changeFrequency: "monthly" as const,
      priority: route === "" ? 1 : route === "/demo" ? 0.4 : 0.7,
    })),
    ...allDocPages().map((page) => ({
      url: `${SITE.url}${page.href}`,
      changeFrequency: "monthly" as const,
      priority: page.slug === "index" || page.slug === "quickstart" ? 0.9 : 0.6,
    })),
  ];
}
