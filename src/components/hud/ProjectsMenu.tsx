"use client";

import { districts } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { Dialog } from "./Dialog";

/** Direct access to every district's content, built or not. */
export function ProjectsMenu() {
  const closeMenu = useGameStore((s) => s.closeMenu);
  const openPanel = useGameStore((s) => s.openPanel);

  return (
    <Dialog title="Projects" onClose={closeMenu} testId="projects-menu">
      <p className="text-[0.65rem] tracking-[0.3em] text-cyan uppercase">Map</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">Districts</h2>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {districts.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="panel flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-cyan"
              onClick={() => openPanel(d.id)}
            >
              <span>
                <span className="block font-semibold">{d.name}</span>
                <span className="block text-xs text-muted">{d.tagline}</span>
              </span>
              <span className="shrink-0 text-[0.6rem] tracking-[0.2em] text-muted uppercase">
                {d.built ? "On the map" : "Planned"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
