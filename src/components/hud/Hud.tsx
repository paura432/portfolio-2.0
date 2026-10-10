"use client";

import { getDistrict } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { TouchControls } from "./TouchControls";

export function Hud() {
  const phase = useGameStore((s) => s.phase);
  const nearby = useGameStore((s) => s.nearbyDistrict);
  const quality = useGameStore((s) => s.quality);
  const interact = useGameStore((s) => s.interact);
  const openMenu = useGameStore((s) => s.openMenu);
  const setQuality = useGameStore((s) => s.setQuality);
  const playing = phase === "playing";
  const district = nearby ? getDistrict(nearby) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] tracking-[0.35em] text-cyan uppercase whitespace-nowrap">Pau World</p>
          <p className="hidden text-sm text-muted sm:block">Technological diorama city</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-2">
          <button
            type="button"
            className="btn btn-secondary h-10 min-h-0 px-3 text-xs whitespace-nowrap"
            onClick={() => setQuality(quality === "high" ? "low" : "high")}
            aria-pressed={quality === "low"}
            aria-label={`Graphics quality: ${quality === "high" ? "high" : "reduced"}. Toggle`}
            title="Toggle reduced graphics"
          >
            <span className="hidden sm:inline">Graphics: </span>
            {quality === "high" ? "High" : "Reduced"}
          </button>
          <button
            type="button"
            className="btn btn-secondary h-10 min-h-0 px-3 text-xs whitespace-nowrap"
            onClick={openMenu}
            disabled={!playing}
          >
            Projects <span className="kbd ml-1 hidden sm:inline-flex">M</span>
          </button>
        </div>
      </div>

      {/* Bottom area */}
      <div className="flex items-end justify-between gap-4">
        <div className="hidden text-xs text-muted sm:block" aria-hidden>
          <span className="kbd">W</span> <span className="kbd">A</span> <span className="kbd">S</span>{" "}
          <span className="kbd">D</span> drive · <span className="kbd">Space</span> brake ·{" "}
          <span className="kbd">E</span> open · <span className="kbd">Esc</span> close
        </div>

        <div className="pointer-events-auto flex flex-1 justify-center sm:flex-none" aria-live="polite">
          {playing && district && (
            <button
              type="button"
              className="panel flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => interact()}
              data-testid="interact-prompt"
            >
              <span className="kbd">E</span>
              <span>
                <span className="block text-[0.65rem] tracking-[0.25em] text-muted uppercase">
                  {district.kind === "hub" ? "Open" : "Open project"}
                </span>
                <span className="block font-semibold">{district.name}</span>
              </span>
            </button>
          )}
        </div>

        <TouchControls enabled={playing} />
      </div>
    </div>
  );
}
