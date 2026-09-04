import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/developers", "/roadmap", "/privacy", "/terms"];
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date("2026-09-04"),
  }));
}
