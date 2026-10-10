"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { inputState, type Action } from "@/game/controls/input";

function useIsCoarsePointer(): boolean {
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

/** On-screen driving controls for touch devices. They write the same input state as the keyboard. */
export function TouchControls({ enabled }: { enabled: boolean }) {
  const coarse = useIsCoarsePointer();
  useEffect(() => {
    if (!enabled) inputState.clear();
  }, [enabled]);
  if (!coarse) return null;
  return (
    <div className={`pointer-events-auto flex items-end gap-6 ${enabled ? "" : "opacity-40"}`}>
      <div className="flex gap-2">
        <HoldButton action="left" label="◀" title="Steer left" />
        <HoldButton action="right" label="▶" title="Steer right" />
      </div>
      <div className="flex flex-col gap-2">
        <HoldButton action="forward" label="▲" title="Accelerate" />
        <HoldButton action="backward" label="▼" title="Reverse" />
      </div>
    </div>
  );
}
