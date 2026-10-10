"use client";

import { getDistrict } from "@/data/districts";
import { resetCar } from "@/game/vehicle/carState";
import { useGameStore } from "@/stores/gameStore";
import { Minimap } from "./Minimap";
import { TouchControls, useIsCoarsePointer } from "./TouchControls";

export function Hud() {
  const phase = useGameStore((s) => s.phase);
  const nearby = useGameStore((s) => s.nearbyDistrict);
  const quality = useGameStore((s) => s.quality);
  const interact = useGameStore((s) => s.interact);
  const openMenu = useGameStore((s) => s.openMenu);
  const setQuality = useGameStore((s) => s.setQuality);
  const coarse = useIsCoarsePointer();
  const playing = phase === "playing";
  const district = nearby ? getDistrict(nearby) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] tracking-[0.35em] text-cyan uppercase whitespace-nowrap">Pau World</p>
          <p className="hidden text-sm text-muted sm:block">Drive to a district · press E to open it</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-hud"
            onClick={() => setQuality(quality === "high" ? "low" : "high")}
            aria-pressed={quality === "low"}
            aria-label={`Graphics quality: ${quality === "high" ? "high" : "reduced"}. Toggle`}
            title="Toggle reduced graphics"
          >
            <span className="hidden sm:inline">Graphics:&nbsp;</span>
            {quality === "high" ? "High" : "Reduced"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-hud"
            onClick={resetCar}
            disabled={!playing}
            title="Put the car back at the start"
            data-testid="reset-car"
          >
            Reset car <span className="kbd ml-1 hidden sm:inline-flex">R</span>
          </button>
          <button type="button" className="btn btn-secondary btn-hud" onClick={openMenu} disabled={!playing} data-testid="open-menu">
            Projects <span className="kbd ml-1 hidden sm:inline-flex">M</span>
          </button>
        </div>
      </div>

      {/* Bottom area */}
      <div className="flex items-end justify-between gap-3">
        <div className="hidden text-[0.8rem] text-muted lg:block" aria-hidden>
          <span className="kbd">W</span> <span className="kbd">A</span> <span className="kbd">S</span>{" "}
          <span className="kbd">D</span> drive · <span className="kbd">Space</span> brake ·{" "}
          <span className="kbd">E</span> open · <span className="kbd">Esc</span> close · <span className="kbd">R</span> reset
        </div>

        <div className="pointer-events-auto flex flex-1 justify-center" aria-live="polite">
          {playing && district && (
            <button
              type="button"
              className="panel flex items-center gap-3 px-4 py-3 text-left shadow-lg shadow-black/30"
              onClick={() => interact()}
              data-testid="interact-prompt"
            >
              <span className="kbd text-base">E</span>
              <span>
                <span className="eyebrow block">{district.kind === "hub" ? "Open" : "Open project"}</span>
                <span className="block text-lg font-semibold leading-tight">{district.name}</span>
              </span>
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {!coarse && <Minimap />}
          <TouchControls enabled={playing} />
        </div>
      </div>

      {/* On touch devices the minimap sits under the top buttons so the thumbs stay free. */}
      {coarse && (
        <div className="pointer-events-none absolute right-3 top-16">
          <Minimap />
        </div>
      )}
    </div>
  );
}
