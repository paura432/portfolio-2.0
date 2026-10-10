"use client";

import { useEffect } from "react";
import { actionForCode, inputState, isEditableTarget } from "@/game/controls/input";
import { resetCar } from "@/game/vehicle/carState";
import { useGameStore } from "@/stores/gameStore";

/**
 * Binds window keyboard events to the mutable input state and to the few
 * store actions that keys trigger (interact, menu, escape). Driving keys never
 * touch React state.
 */
export function useKeyboardControls(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const store = useGameStore.getState();

      if (e.code === "Escape") {
        if (store.phase === "panel") store.closePanel();
        else if (store.phase === "menu") store.closeMenu();
        return;
      }

      const action = actionForCode(e.code);
      if (!action) return;

      if (action === "interact") {
        if (e.repeat) return;
        if (store.interact()) e.preventDefault();
        return;
      }
      if (action === "menu") {
        if (!e.repeat) store.toggleMenu();
        return;
      }
      if (action === "reset") {
        if (!e.repeat && store.phase === "playing") resetCar();
        return;
      }
      // Driving keys: only while playing, and never let them scroll the page.
      if (store.phase === "playing") {
        e.preventDefault();
        inputState.pressed.add(action);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const action = actionForCode(e.code);
      if (action) inputState.pressed.delete(action);
    };

    const clear = () => inputState.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      clear();
    };
  }, [enabled]);
}
