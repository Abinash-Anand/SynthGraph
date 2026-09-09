import type { MetadataRoute } from "next";
import { SITE } from "@/data/site";

const ROUTES = ["", "/product", "/how-it-works", "/research", "/developers", "/security", "/about", "/demo"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${SITE.url}${route}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : route === "/demo" ? 0.9 : 0.7,
  }));
}
