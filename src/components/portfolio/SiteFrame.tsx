import Link from "next/link";
import { profile } from "@/data/profile";

/** Chrome for the HTML routes (no WebGL involved). */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4" aria-label="Primary">
          <Link href="/" className="text-xs tracking-[0.35em] text-cyan uppercase">
            Pau World
          </Link>
          <div className="flex gap-2 text-sm">
            <Link href="/projects" className="btn btn-ghost h-9 min-h-0 px-3">
              Projects
            </Link>
            <Link href="/contact" className="btn btn-ghost h-9 min-h-0 px-3">
              Contact
            </Link>
            <Link href="/" className="btn btn-secondary h-9 min-h-0 px-3">
              Explore 3D
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-muted">
        {profile.name} · {profile.role}
      </footer>
    </div>
  );
}
