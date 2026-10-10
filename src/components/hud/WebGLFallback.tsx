import Link from "next/link";
import { profile } from "@/data/profile";

/** Shown when WebGL is unavailable. The HTML portfolio stays fully usable. */
export function WebGLFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-xl text-center" role="status">
        <p className="text-xs tracking-[0.4em] text-cyan uppercase">Pau World</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{profile.name}</h1>
        <p className="mt-2 text-lg text-muted">{profile.role}</p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">
          The 3D city needs WebGL, which this browser does not provide. Everything in it is also available as
          regular pages.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/projects" className="btn btn-primary">
            View projects
          </Link>
        </div>
      </div>
    </main>
  );
}
