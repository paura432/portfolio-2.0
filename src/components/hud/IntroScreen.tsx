"use client";

import Image from "next/image";
import Link from "next/link";
import { builtDistricts } from "@/data/districts";
import { profile } from "@/data/profile";
import { useGameStore } from "@/stores/gameStore";
import { CvLinks } from "@/components/portfolio/CvLinks";

export function IntroScreen({ checking }: { checking: boolean }) {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-bg">
      <div className="mx-auto grid min-h-full w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-12">
        {/* Who, what, where */}
        <section className="rise">
          <p className="eyebrow text-cyan">Pau World · interactive portfolio</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{profile.name}</h1>
          <p className="mt-2 text-lg text-muted sm:text-xl">
            {profile.role} · {profile.location}
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg">{profile.summary}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Focus areas">
            {profile.focus.map((f) => (
              <li key={f.title} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm leading-snug text-muted">{f.detail}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn btn-primary" onClick={startGame} disabled={checking} autoFocus data-testid="explore">
              Explore the 3D city
            </button>
            <Link href="/projects" className="btn btn-secondary">
              View projects
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              Contact
            </Link>
          </div>
          <CvLinks className="mt-3" />
          <p className="mt-4 text-sm text-muted">
            <a href={profile.github} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
            {" · "}
            <a href={profile.linkedin} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer noopener">
              LinkedIn
            </a>
            {" · "}
            <a href={`mailto:${profile.email}`} className="underline-offset-4 hover:underline">
              {profile.email}
            </a>
          </p>
        </section>

        {/* City preview: a still image, no WebGL until the visitor asks for it */}
        <section className="rise rise-2" aria-label="The 3D city">
          <button
            type="button"
            onClick={startGame}
            disabled={checking}
            className="group relative block w-full overflow-hidden rounded-2xl border border-line text-left shadow-2xl shadow-black/40 focus-visible:outline-2"
            aria-label="Open the 3D city"
          >
            <Image
              src="/preview/city.jpg"
              alt="Night view of the low-poly city: the orange car on the road toward the Central Hub, DUPLEX on the left and OVI on the right"
              width={1440}
              height={900}
              priority
              unoptimized
              className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/95 via-bg/60 to-transparent p-4 pt-10 sm:p-5">
              <p className="eyebrow text-cyan">A small city, one district per project</p>
              <p className="mt-1 text-base font-medium">Drive the orange car. Reach a building. Press E to open its case study.</p>
              <p className="mt-1 text-sm text-muted">
                Built now: {builtDistricts.map((d) => d.name).join(" · ")}. WASD or arrows; touch controls on phones.
              </p>
            </div>
          </button>
          <p className="mt-3 text-xs text-muted">
            Needs WebGL. Every project is also a plain page under <Link href="/projects" className="underline underline-offset-4">/projects</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
