"use client";

import Link from "next/link";
import { districts, type District } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { Dialog } from "./Dialog";

function Entry({ district, onOpen }: { district: District; onOpen: () => void }) {
  const dot = district.built ? (district.accent === "cyan" ? "bg-cyan" : "bg-amber") : "border border-muted";
  return (
    <li className="panel flex items-stretch overflow-hidden">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]" onClick={onOpen}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="min-w-0">
          <span className="block font-semibold">{district.name}</span>
          <span className="block truncate text-xs text-muted">{district.tagline}</span>
        </span>
      </button>
      <Link
        href={district.route}
        className="flex shrink-0 items-center border-l border-line px-3 text-xs text-muted hover:text-text"
        aria-label={`${district.name}: open as page`}
        title="Open as page"
      >
        Page ↗
      </Link>
    </li>
  );
}

/** Direct access to every district's content, split by what is on the map. */
export function ProjectsMenu() {
  const closeMenu = useGameStore((s) => s.closeMenu);
  const openPanel = useGameStore((s) => s.openPanel);
  const built = districts.filter((d) => d.built);
  const planned = districts.filter((d) => !d.built);

  return (
    <Dialog
      label="Projects"
      header={
        <>
          <p className="eyebrow text-cyan">Map</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Districts</h2>
        </>
      }
      onClose={closeMenu}
      testId="projects-menu"
    >
      <section>
        <h3 className="eyebrow">On the map · drive there or open directly</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="menu-built">
          {built.map((d) => (
            <Entry key={d.id} district={d} onOpen={() => openPanel(d.id)} />
          ))}
        </ul>
      </section>
      {planned.length > 0 && (
        <section className="mt-6">
          <h3 className="eyebrow">Content ready · building planned</h3>
          <p className="mt-1 text-sm text-muted">These districts are not on the map yet. Their content is complete and opens here or as a page.</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="menu-planned">
            {planned.map((d) => (
              <Entry key={d.id} district={d} onOpen={() => openPanel(d.id)} />
            ))}
          </ul>
        </section>
      )}
    </Dialog>
  );
}
