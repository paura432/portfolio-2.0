"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { inputState, type Action } from "@/game/controls/input";
import { bodyModeOf } from "@/game/vehicle/transformer";
import { useGameStore } from "@/stores/gameStore";

export function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

function HoldButton({ action, label, title }: { action: Action; label: string; title: string }) {
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    inputState.pressed.add(action);
  };
  const release = () => inputState.pressed.delete(action);
  return (
    <button
      type="button"
      className="touch-btn"
      aria-label={title}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/**
 * On-screen driving controls for touch devices. Steering sits under the left
 * thumb, throttle under the right thumb, both at the bottom corners so the
 * road and the prompt stay visible. They write the same input state as the keyboard.
 */
export function TouchControls({ enabled }: { enabled: boolean }) {
  const coarse = useIsCoarsePointer();
  // The same four buttons drive every body; their names follow it so a screen reader says what the thumb does.
  const body = bodyModeOf(useGameStore((s) => s.vehicleState));
  const names = body === "plane" ? { left: "Bank left", right: "Bank right", forward: "Climb", backward: "Descend" } : body === "boat" ? { left: "Steer left", right: "Steer right", forward: "Throttle", backward: "Reverse" } : { left: "Steer left", right: "Steer right", forward: "Accelerate", backward: "Reverse" };
  useEffect(() => {
    if (!enabled) inputState.clear();
  }, [enabled]);
  if (!coarse) return null;
  return (
    <div className={`pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between ${enabled ? "" : "opacity-40"}`} data-testid="touch-controls">
      <div className="pointer-events-auto flex gap-2">
        <HoldButton action="left" label="◀" title={names.left} />
        <HoldButton action="right" label="▶" title={names.right} />
      </div>
      <div className="pointer-events-auto flex flex-col gap-2">
        <HoldButton action="forward" label="▲" title={names.forward} />
        <HoldButton action="backward" label="▼" title={names.backward} />
      </div>
    </div>
  );
}
