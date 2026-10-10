import type { Metadata, Viewport } from "next";
import { profile } from "@/data/profile";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `PAU WORLD · ${profile.name}`,
    template: `%s · PAU WORLD`,
  },
  description: `${profile.name}, ${profile.role}. An interactive 3D portfolio city: drive to each district to open a project.`,
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
