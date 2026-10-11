"use client";

import { useEffect, useState } from "react";
import { getHarbor } from "@/data/archipelago";
import { canBoard, canDock, carAvailableAt, poseOf } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

type Action = "board" | "dock" | "drive";

/**
 * Contextual vehicle action (V6): "Press E to board" when the slow car is in a
 * harbor's boarding zone, "Press E to dock" / "Press E to drive" when the slow
 * boat is in a docking zone. Speed lives outside React, so the prompt polls it
 * once per animation frame and only re-renders on a change.
 */
export function VehiclePrompt() {
  const interact = useGameStore((s) => s.interact);
  const transition = useGameStore((s) => s.transition);
  const activeVehicle = useGameStore((s) => s.activeVehicle);
  const mooredAt = useGameStore((s) => s.mooredAt);
  const nearbyHarbor = useGameStore((s) => s.nearbyHarbor);
  const nearbyDock = useGameStore((s) => s.nearbyDock);
  // The computed action is keyed by (vehicle, harbor) so a stale value from a previous zone is never shown.
  const [computed, setComputed] = useState<{ key: string; action: Action | null }>({ key: "", action: null });

  const harbor = activeVehicle === "car" ? nearbyHarbor : nearbyDock;
  const eligible = !transition && !mooredAt && harbor !== null;
  const key = eligible ? `${activeVehicle}:${harbor}` : "";

  useEffect(() => {
    if (!eligible || !harbor) return;
    let raf = 0;
    const tick = () => {
      let next: Action | null = null;
      if (activeVehicle === "car") {
        if (canBoard(poseOf("car").speed, harbor)) next = "board";
      } else if (canDock(poseOf("boat").speed, harbor)) {
        const car = poseOf("car");
        next = carAvailableAt(harbor, car.x, car.z) ? "drive" : "dock";
      }
      setComputed((prev) => (prev.key === key && prev.action === next ? prev : { key, action: next }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [eligible, harbor, activeVehicle, key]);

  const action = computed.key === key ? computed.action : null;
  if (!eligible || !harbor || !action) return null;
  const h = getHarbor(harbor);
  const label = action === "board" ? "Board the boat" : action === "drive" ? "Dock and drive" : "Dock";
  return (
    <button
      type="button"
      className="panel flex items-center gap-3 border-cyan/40 px-4 py-3 text-left shadow-lg shadow-black/30"
      onClick={() => interact()}
      onPointerDown={(e) => e.stopPropagation()}
      data-testid="vehicle-prompt"
      data-action={action}
      data-harbor={harbor}
    >
      <span className="kbd text-base">E</span>
      <span>
        <span className="eyebrow block">{label}</span>
        <span className="block text-lg font-semibold leading-tight">{h.name}</span>
      </span>
    </button>
  );
}
