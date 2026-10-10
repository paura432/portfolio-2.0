import { profile } from "@/data/profile";

/**
 * Public site URL. Set NEXT_PUBLIC_SITE_URL in the deployment environment;
 * without it, absolute URLs (canonical, sitemap, Open Graph) are omitted
 * rather than invented.
 */
export const siteUrl: string | null = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? null;

export const siteName = "PAU WORLD";
export const siteDescription = `${profile.name}, ${profile.role}. ${profile.summary} Explore an interactive 3D city or read the projects as pages.`;
export const previewImage = { url: "/preview/city.jpg", width: 1440, height: 900, alt: "PAU WORLD: a low-poly night city with an orange car on the road to the Central Hub" };
