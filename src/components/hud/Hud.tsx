"use client";

import { useEffect, useState } from "react";
import { getHarbor, getPoi, pointsOfInterest } from "@/data/archipelago";
import { getDistrict, type DistrictId } from "@/data/districts";
import { SKYPORT } from "@/data/skyport";
import { QUALITY_LABEL, nextQuality } from "@/game/render/quality";
import { liveCar } from "@/game/vehicle/carState";
import { livePlane } from "@/game/vehicle/planeState";
import { resetActiveVehicle } from "@/game/vehicle/resetVehicle";
import { RECONFIGURE_MAX_SPEED, TRANSFORM_MAX_SPEED } from "@/game/vehicle/transform";
import { resolveVehicleMode, TRANSFORMING, usesPlanePose } from "@/game/vehicle/vehicleManager";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";
import { Minimap } from "./Minimap";
import { TouchControls, useIsCoarsePointer } from "./TouchControls";
import { VehiclePrompt } from "./VehiclePrompt";

/** Speed and altitude while in flight form, read once per animation frame outside React. */
function FlightReadout() {
  const [text, setText] = useState({ speed: 0, altitude: 0 });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = livePlane.state;
      const next = { speed: Math.round(p.speed * 3.6), altitude: Math.max(0, Math.round(p.y - SKYPORT.runway.y)) };
      setText((prev) => (prev.speed === next.speed && prev.altitude === next.altitude ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <p className="mt-1 text-[0.72rem] tracking-[0.2em] text-muted uppercase" data-testid="flight-readout">
      <span className="text-text">{text.speed}</span> km/h · alt <span className="text-text">{text.altitude}</span> m
    </p>
  );
}

/** "Transform for flight" on the pad (car stopped) and "Reconfigure for ground mode" once rolled out and stopped. */
function TransformPrompt({ planeForm, nearbyPad }: { planeForm: boolean; nearbyPad: boolean }) {
  const interact = useGameStore((s) => s.interact);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = planeForm ? livePlane.state.onGround && livePlane.state.speed <= RECONFIGURE_MAX_SPEED : nearbyPad && Math.abs(liveCar.state.speed) <= TRANSFORM_MAX_SPEED;
      setReady((prev) => (prev === next ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [planeForm, nearbyPad]);
  if (!ready) return null;
  return (
    <button
      type="button"
      className="panel flex items-center gap-3 border-amber/40 px-4 py-3 text-left shadow-lg shadow-black/30"
      onClick={() => interact()}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid="transform-prompt"
      data-action={planeForm ? "to-car" : "to-plane"}
    >
      <span className="kbd text-base">E</span>
      <span>
        <span className="eyebrow block">{planeForm ? "Reconfigure" : "PAU AERO-X"}</span>
        <span className="block text-lg font-semibold leading-tight">{planeForm ? "Ground mode" : "Transform for flight"}</span>
      </span>
    </button>
  );
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
  const activeVehicle = useGameStore((s) => s.activeVehicle);
  const transition = useGameStore((s) => s.transition);
  const mooredAt = useGameStore((s) => s.mooredAt);
  const nearbyHarbor = useGameStore((s) => s.nearbyHarbor);
  const nearbyDock = useGameStore((s) => s.nearbyDock);
  const carForm = useGameStore((s) => s.carForm);
  const flight = useGameStore((s) => s.flight);
  const nearbyPad = useGameStore((s) => s.nearbyPad);
  const landingZone = useGameStore((s) => s.landingZone);
  const flightNotice = useGameStore((s) => s.flightNotice);
  const coarse = useIsCoarsePointer();
  const playing = phase === "playing";
  const mode = resolveVehicleMode(phase, { activeVehicle, transition, mooredAt, nearbyHarbor, nearbyDock, carForm, flight });
  const boat = activeVehicle === "boat";
  const planeForm = !boat && usesPlanePose({ carForm, flight });
  const transforming = TRANSFORMING.has(flight);
  const controllable = playing && !transition && !transforming;
  const district = nearby ? getDistrict(nearby) : null;
  // A lab zone (campus secondary building) takes precedence over the district zone it sits in.
  const labDistrict = nearbyLab ? getDistrict(nearbyLab.split(":")[0] as DistrictId) : null;
  const lab = nearbyLab ? labDistrict?.plots?.find((p) => p.id === nearbyLab.split(":")[1]) : null;
  const poi = mooredAt ? pointsOfInterest.find((p) => p.harbor === mooredAt) : null;
  const prompt = boat
    ? poi
      ? { eyebrow: "Explore", title: getPoi(poi.id).name }
      : null
    : planeForm
      ? null
      : lab && labDistrict
        ? { eyebrow: "Open lab", title: lab.name }
        : district
          ? { eyebrow: district.kind === "hub" ? "Open" : district.kind === "education" ? "Explore" : "Open project", title: district.name }
          : null;
  const legend = boat
    ? mooredAt
      ? `Moored at ${getHarbor(mooredAt).name} · W casts off`
      : "Sail to a pier · press E to dock"
    : transforming
      ? flight === "transforming-to-plane"
        ? "Transforming for flight…"
        : "Reconfiguring for the road…"
      : planeForm
        ? flight === "flying"
          ? "W climb · S descend · A/D bank · land on the Skyport runway"
          : flight === "landing"
            ? "Brake, stop, then press E to reconfigure"
            : "Hold W down the runway to take off"
        : "Drive to a district · press E to open it";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-6" data-vehicle={activeVehicle} data-vehicle-mode={mode} data-car-form={carForm}>
      {/* Top bar: brand on the left, compact controls on the right. On phones the minimap hangs under the brand so the horizon stays clear. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] tracking-[0.35em] text-cyan uppercase whitespace-nowrap">
            Pau World
            {boat && (
              <span className="ml-2 text-amber" data-testid="mode-badge">
                · Boat
              </span>
            )}
            {planeForm && (
              <span className="ml-2 text-amber" data-testid="mode-badge">
                · Flight
              </span>
            )}
          </p>
          <p className="hidden text-sm text-muted sm:block" data-testid="hud-legend">
            {legend}
          </p>
          {planeForm && !transforming && <FlightReadout />}
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
            title={boat ? "Put the boat back at the nearest pier" : planeForm ? "Put the aircraft back on the Skyport pad as a car" : "Put the car back at the start"}
            data-testid="reset-car"
          >
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">{boat ? "Reset boat" : planeForm ? "Reset plane" : "Reset car"}</span>
            <span className="kbd ml-1 hidden sm:inline-flex">R</span>
          </button>
          {!boat && !planeForm && (
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
          {planeForm ? (
            <>
              <span className="kbd">W</span> climb · <span className="kbd">S</span> descend · <span className="kbd">A</span> <span className="kbd">D</span> bank ·{" "}
              <span className="kbd">Space</span> brake · <span className="kbd">E</span> reconfigure · <span className="kbd">R</span> reset
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
          {playing && !boat && !planeForm && lastImpact && (
            <span key={lastImpact.at} className="impact-toast text-[0.72rem] tracking-[0.2em] text-muted uppercase" data-testid="impact-toast" data-kind={lastImpact.kind}>
              {lastImpact.kind === "break" ? "Trunk snapped" : lastImpact.kind === "topple" ? "Tree knocked down" : "Tree shaken"}
            </span>
          )}
          {playing && flightNotice && (
            <span key={flightNotice.at} className="impact-toast text-[0.72rem] tracking-[0.2em] text-amber uppercase" data-testid="flight-notice">
              {flightNotice.text}
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
          {playing && !planeForm && <VehiclePrompt />}
          {controllable && !boat && (planeForm || nearbyPad) && <TransformPrompt planeForm={planeForm} nearbyPad={nearbyPad} />}
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
