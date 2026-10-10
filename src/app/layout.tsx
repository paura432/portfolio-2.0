import type { Metadata, Viewport } from "next";
import { profile } from "@/data/profile";
import { previewImage, siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: `${siteName} · ${profile.name}`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: profile.name, url: profile.github }],
  creator: profile.name,
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} · ${profile.name}`,
    description: siteDescription,
    images: [previewImage],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} · ${profile.name}`,
    description: siteDescription,
    images: [previewImage.url],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080F1D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-bg text-text">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
