"use client";

import { useEffect, useState } from "react";
import { getHarbor } from "@/data/archipelago";
import { canDock, poseOf } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

/**
 * Contextual pier action (V6, kept in V8): "Press E to dock" when the slow
 * hull is in a pier's docking zone. Speed lives outside React, so the prompt
 * polls it once per animation frame and only re-renders on a change.
 */
export function VehiclePrompt() {
  const interact = useGameStore((s) => s.interact);
  const transition = useGameStore((s) => s.transition);
  const state = useGameStore((s) => s.vehicleState);
  const mooredAt = useGameStore((s) => s.mooredAt);
  const nearbyDock = useGameStore((s) => s.nearbyDock);
  const [computed, setComputed] = useState<{ key: string; ok: boolean }>({ key: "", ok: false });

  const eligible = !transition && !mooredAt && state === "floating" && nearbyDock !== null;
  const key = eligible ? `dock:${nearbyDock}` : "";

  useEffect(() => {
    if (!eligible || !nearbyDock) return;
    let raf = 0;
    const tick = () => {
      const ok = canDock(poseOf("floating").speed, nearbyDock);
      setComputed((prev) => (prev.key === key && prev.ok === ok ? prev : { key, ok }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [eligible, nearbyDock, key]);

  if (!eligible || !nearbyDock || computed.key !== key || !computed.ok) return null;
  const h = getHarbor(nearbyDock);
  return (
    <button
      type="button"
      className="panel flex items-center gap-3 border-cyan/40 px-4 py-3 text-left shadow-lg shadow-black/30"
      onClick={() => interact()}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid="vehicle-prompt"
      data-action="dock"
      data-harbor={nearbyDock}
    >
      <span className="kbd text-base">E</span>
      <span>
        <span className="eyebrow block">Dock</span>
        <span className="block text-lg font-semibold leading-tight">{h.name}</span>
      </span>
    </button>
  );
}
