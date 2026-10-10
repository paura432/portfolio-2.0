"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "@/stores/gameStore";

/**
 * Marks the scene ready on the second frame callback, i.e. after the first
 * frame has actually been rendered (useFrame runs before each render).
 */
export function FirstFrameSignal() {
  const setSceneReady = useGameStore((s) => s.setSceneReady);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current < 2) {
      frames.current++;
      if (frames.current === 2) setSceneReady(true);
    }
  }, -10);
  useEffect(() => () => setSceneReady(false), [setSceneReady]);
  return null;
}

/**
 * WebGL context loss: prevent the default so the browser may restore it,
 * flag the store so the shell can show a recovery overlay, clear on restore.
 */
export function ContextLossHandler() {
  const gl = useThree((s) => s.gl);
  const setContextLost = useGameStore((s) => s.setContextLost);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => setContextLost(false);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      setContextLost(false);
    };
  }, [gl, setContextLost]);
  return null;
}
