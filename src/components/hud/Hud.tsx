"use client";

import { useEffect, useState } from "react";
import { getHarbor, getPoi, pointsOfInterest } from "@/data/archipelago";
import { getBeach } from "@/data/beaches";
import { getDistrict, type DistrictId } from "@/data/districts";
import { getRamp } from "@/data/ramps";
import { QUALITY_LABEL, nextQuality } from "@/game/render/quality";
import { liveCar } from "@/game/vehicle/carState";
import { resetActiveVehicle } from "@/game/vehicle/resetVehicle";
import { bodyModeOf, DEPLOY_SPEED, isTransforming, TAKEOFF_SPEED, type VehicleState } from "@/game/vehicle/transformer";
import { poseOf, resolveVehicleMode } from "@/game/vehicle/vehicleManager";
import { groundHeightAt } from "@/game/world/ground";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";
import { Minimap } from "./Minimap";
import { TouchControls, useIsCoarsePointer } from "./TouchControls";
import { VehiclePrompt } from "./VehiclePrompt";

/** Speed (and altitude in the air), read once per animation frame outside React. */
function Readout({ state }: { state: VehicleState }) {
  const [text, setText] = useState({ speed: 0, altitude: 0 });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = poseOf(useGameStore.getState().vehicleState);
      const next = { speed: Math.round(p.speed * 3.6), altitude: Math.max(0, Math.round(p.y - groundHeightAt(p.x, p.z))) };
      setText((prev) => (prev.speed === next.speed && prev.altitude === next.altitude ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const air = bodyModeOf(state) === "plane";
  return (
    <p className="mt-1 text-[0.72rem] tracking-[0.2em] text-muted uppercase" data-testid="readout">
      <span className="text-text">{text.speed}</span> km/h
      {air && (
        <>
          {" "}
          · alt <span className="text-text">{text.altitude}</span> m
        </>
      )}
    </p>
  );
}

const MODE_LABEL = { car: "Car", boat: "Boat", plane: "Flight" } as const;

function legendFor(state: VehicleState, mooredAt: string | null, nearbyRamp: string | null, nearbyBeach: string | null): string {
  switch (state) {
    case "preparing-flight":
      return `${nearbyRamp ? getRamp(nearbyRamp as never).name : "Ramp"} · keep above ${Math.round(DEPLOY_SPEED * 3.6)} km/h to deploy the wings`;
    case "transforming-to-plane":
      return `Wings deploying · hold the speed over the lip (≥ ${Math.round(TAKEOFF_SPEED * 3.6)} km/h)`;
    case "flying":
      return "W climb · S descend · A/D bank · land on open ground or on the sea";
    case "landing":
      return "Touchdown · rolling out";
    case "transforming-to-car":
      return "Wings folding…";
    case "transforming-to-boat":
      return "Hull out · floats down…";
    case "floating":
      return mooredAt ? `Moored at ${getHarbor(mooredAt as never).name} · W casts off` : "Sail to a beach to drive out, or to a pier to dock";
    case "exiting-water":
      return "Wheels down…";
    default:
      return nearbyBeach ? `${getBeach(nearbyBeach as never).name} · drive into the sea to set sail` : nearbyRamp ? `${getRamp(nearbyRamp as never).name} ahead · speed up to take off` : "Drive to a district · press E to open it";
  }
}

export function Hud() {
  const phase = useGameStore((s) => s.phase);
  const nearby = useGameStore((s) => s.nearbyDistrict);
  const nearbyLab = useGameStore((s) => s.nearbyLab);
  const quality = useGameStore((s) => s.quality);
  const treesDown = useGameStore((s) => s.treesDown);
  const lastImpact = useGameStore((s) => s.lastImpact);
  const interact = useGameStore((s) => s.interact);
  const castOff = useGameStore((s) => s.castOff);
  const openMenu = useGameStore((s) => s.openMenu);
  const setQuality = useGameStore((s) => s.setQuality);
  const state = useGameStore((s) => s.vehicleState);
  const transition = useGameStore((s) => s.transition);
  const mooredAt = useGameStore((s) => s.mooredAt);
  const nearbyDock = useGameStore((s) => s.nearbyDock);
  const nearbyRamp = useGameStore((s) => s.nearbyRamp);
  const nearbyBeach = useGameStore((s) => s.nearbyBeach);
  const landingZone = useGameStore((s) => s.landingZone);
  const vehicleNotice = useGameStore((s) => s.vehicleNotice);
  const coarse = useIsCoarsePointer();
  const playing = phase === "playing";
  const mode = resolveVehicleMode(phase, { vehicleState: state, transition, mooredAt, nearbyDock });
  const body = bodyModeOf(state);
  const boat = body === "boat";
  const air = body === "plane";
  const transforming = isTransforming(state);
  const controllable = playing && !transition && !mooredAt;
  const district = nearby ? getDistrict(nearby) : null;
  const labDistrict = nearbyLab ? getDistrict(nearbyLab.split(":")[0] as DistrictId) : null;
  const lab = nearbyLab ? labDistrict?.plots?.find((p) => p.id === nearbyLab.split(":")[1]) : null;
  const poi = mooredAt ? pointsOfInterest.find((p) => p.harbor === mooredAt) : null;
  const prompt =
    state === "floating" && poi
      ? { eyebrow: "Explore", title: getPoi(poi.id).name }
      : state === "car" && lab && labDistrict
        ? { eyebrow: "Open lab", title: lab.name }
        : state === "car" && district
          ? { eyebrow: district.kind === "hub" ? "Open" : district.kind === "education" ? "Explore" : "Open project", title: district.name }
          : null;
  const legend = legendFor(state, mooredAt, nearbyRamp, nearbyBeach);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6" data-vehicle-state={state} data-vehicle-mode={mode} data-body={body}>
      {/* Top bar: brand on the left, compact controls on the right. On phones the minimap hangs under the brand so the horizon stays clear. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] tracking-[0.35em] text-cyan uppercase whitespace-nowrap">
            Pau World
            <span className={`ml-2 ${body === "car" ? "text-muted" : "text-amber"}`} data-testid="mode-badge" data-mode={body}>
              · {MODE_LABEL[body]} mode
            </span>
          </p>
          <p className="hidden text-sm text-muted sm:block" data-testid="hud-legend">
            {legend}
          </p>
          {state !== "car" && <Readout state={state} />}
          {coarse && (
            <div className="pointer-events-auto mt-2">
              <Minimap />
            </div>
          )}
        </div>
        <div className={`pointer-events-auto flex shrink-0 flex-wrap justify-end gap-2 ${coarse ? "hud-compact" : ""}`}>
          <button
            type="button"
            className="btn btn-secondary btn-hud"
            onClick={() => setQuality(nextQuality(quality))}
            aria-label={`Graphics quality: ${QUALITY_LABEL[quality]}. Switch`}
            title="Cycle graphics quality (High, Medium, Low)"
            data-testid="quality-toggle"
            data-quality={quality}
          >
            <span className="hidden sm:inline">Graphics:&nbsp;</span>
            {QUALITY_LABEL[quality]}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-hud"
            onClick={resetActiveVehicle}
            disabled={!playing}
            title="Recover: back to the car at the nearest safe spot"
            data-testid="reset-car"
          >
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">{boat ? "Reset boat" : air ? "Reset plane" : "Reset car"}</span>
            <span className="kbd ml-1 hidden sm:inline-flex">R</span>
          </button>
          {body === "car" && (
            <button
              type="button"
              className="btn btn-secondary btn-hud"
              onClick={() => treeWorld.resetWorld(liveCar.state.x, liveCar.state.z)}
              disabled={!playing || treesDown === 0}
              title="Regrow every knocked-down tree (the car stays where it is)"
              data-testid="reset-world"
              data-trees-down={treesDown}
            >
              <span className="sm:hidden">World</span>
              <span className="hidden sm:inline">Reset world</span>
              {treesDown > 0 && <span className="ml-1 text-cyan">{treesDown}</span>}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-hud" onClick={openMenu} disabled={!playing} data-testid="open-menu">
            Projects <span className="kbd ml-1 hidden sm:inline-flex">M</span>
          </button>
        </div>
      </div>

      {/* Bottom area: key legend (desktop), interaction prompt, minimap (desktop) and touch controls (phones) */}
      <div className="flex items-end justify-between gap-3">
        <div className="hidden text-[0.8rem] text-muted lg:block" aria-hidden>
          {air ? (
            <>
              <span className="kbd">W</span> climb · <span className="kbd">S</span> descend · <span className="kbd">A</span> <span className="kbd">D</span> bank ·{" "}
              <span className="kbd">Space</span> brake · <span className="kbd">R</span> recover
            </>
          ) : (
            <>
              <span className="kbd">W</span> <span className="kbd">A</span> <span className="kbd">S</span> <span className="kbd">D</span> {boat ? "sail" : "drive"} ·{" "}
              <span className="kbd">Space</span> brake · <span className="kbd">E</span> {boat ? (mooredAt ? "explore" : "dock") : "open"} · <span className="kbd">Esc</span> close ·{" "}
              <span className="kbd">R</span> reset
            </>
          )}
        </div>

        <div className={`pointer-events-auto flex flex-1 flex-col items-center justify-end gap-2 ${coarse ? "self-end pb-1" : ""}`} aria-live="polite">
          {playing && body === "car" && lastImpact && (
            <span key={lastImpact.at} className="impact-toast text-[0.72rem] tracking-[0.2em] text-muted uppercase" data-testid="impact-toast" data-kind={lastImpact.kind}>
              {lastImpact.kind === "break" ? "Trunk snapped" : lastImpact.kind === "topple" ? "Tree knocked down" : "Tree shaken"}
            </span>
          )}
          {playing && vehicleNotice && (
            <span key={vehicleNotice.at} className="impact-toast text-[0.72rem] tracking-[0.2em] text-amber uppercase" data-testid="vehicle-notice">
              {vehicleNotice.text}
            </span>
          )}
          {playing && transforming && (
            <span className="text-[0.72rem] tracking-[0.2em] text-cyan uppercase" data-testid="transform-banner" data-state={state}>
              {state === "transforming-to-plane" ? "Wings deploying" : state === "transforming-to-car" ? "Wings folding" : state === "transforming-to-boat" ? "Hull deploying" : "Wheels down"}
            </span>
          )}
          {playing && landingZone && (
            <span className="text-[0.72rem] tracking-[0.2em] text-cyan uppercase" data-testid="landing-zone">
              Landing zone detected
            </span>
          )}
          {controllable && prompt && (
            <button
              type="button"
              className="panel flex items-center gap-3 px-4 py-3 text-left shadow-lg shadow-black/30"
              onClick={() => interact()}
              onPointerDown={(e) => e.stopPropagation()}
              data-testid="interact-prompt"
              data-lab={lab?.id ?? ""}
            >
              <span className="kbd text-base">E</span>
              <span>
                <span className="eyebrow block">{prompt.eyebrow}</span>
                <span className="block text-lg font-semibold leading-tight">{prompt.title}</span>
              </span>
            </button>
          )}
          {playing && <VehiclePrompt />}
          {controllable && mooredAt && (
            <button type="button" className="btn btn-secondary btn-hud" onClick={() => castOff()} onPointerDown={(e) => e.stopPropagation()} data-testid="cast-off">
              Cast off <span className="kbd ml-1 hidden sm:inline-flex">W</span>
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {!coarse && <Minimap />}
          <TouchControls enabled={controllable} />
        </div>
      </div>
    </div>
  );
}
