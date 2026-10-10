"use client";

import Link from "next/link";
import { profile } from "@/data/profile";
import { useGameStore } from "@/stores/gameStore";

export function IntroScreen({ checking }: { checking: boolean }) {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-xl text-center">
        <p className="text-xs tracking-[0.4em] text-cyan uppercase">Pau World</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
        <p className="mt-2 text-lg text-muted">{profile.role}</p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">
          A small technological city. Drive to a district to open its project. Keyboard: WASD or arrows, E to
          open, Esc to close.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto"
            onClick={startGame}
            disabled={checking}
            autoFocus
          >
            Explore world
          </button>
          <Link href="/projects" className="btn btn-secondary w-full sm:w-auto">
            View projects
          </Link>
        </div>
        <p className="mt-10 text-xs text-muted">{profile.location}</p>
      </div>
    </div>
  );
}
