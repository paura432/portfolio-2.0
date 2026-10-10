import type { MetadataRoute } from "next";
import { labs } from "@/data/education/fourgeeks";
import { projects } from "@/data/projects";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, priority: 1 },
    { url: `${siteUrl}/projects`, lastModified: now, priority: 0.9 },
    { url: `${siteUrl}/contact`, lastModified: now, priority: 0.6 },
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}`, lastModified: now, priority: 0.8 })),
    { url: `${siteUrl}/education/4geeks`, lastModified: now, priority: 0.8 },
    ...labs.map((l) => ({ url: `${siteUrl}/education/4geeks/${l.slug}`, lastModified: now, priority: 0.7 })),
  ];
}
