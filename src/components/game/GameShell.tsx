"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { isWebGLAvailable } from "@/lib/webgl";
import { useGameStore } from "@/stores/gameStore";
import { Hud } from "@/components/hud/Hud";
import { IntroScreen } from "@/components/hud/IntroScreen";
import { ProjectPanel } from "@/components/hud/ProjectPanel";
import { ProjectsMenu } from "@/components/hud/ProjectsMenu";
import { WebGLFallback } from "@/components/hud/WebGLFallback";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

// The renderer is client-only: never server-render WebGL.
const GameCanvas = dynamic(() => import("./GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => null,
});

type Support = "checking" | "ok" | "unsupported";

let cachedSupport: Support | null = null;
const noSubscribe = () => () => {};
const readSupport = (): Support => {
  if (cachedSupport === null) cachedSupport = isWebGLAvailable() ? "ok" : "unsupported";
  return cachedSupport;
};
const serverSupport = (): Support => "checking";

export function GameShell() {
  // Server renders "checking"; the client resolves WebGL support once, without a cascading effect.
  const support = useSyncExternalStore(noSubscribe, readSupport, serverSupport);
  const phase = useGameStore((s) => s.phase);
  const sceneReady = useGameStore((s) => s.sceneReady);
  const started = phase !== "intro";

  useKeyboardControls(started && support === "ok");

  if (support === "unsupported") return <WebGLFallback />;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      {support === "ok" && started && (
        <SceneErrorBoundary>
          <GameCanvas />
        </SceneErrorBoundary>
      )}

      {started && !sceneReady && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-bg"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm tracking-[0.3em] text-muted uppercase">Loading world</p>
        </div>
      )}

      {!started && <IntroScreen checking={support === "checking"} />}
      {started && <Hud />}
      {phase === "panel" && <ProjectPanel />}
      {phase === "menu" && <ProjectsMenu />}
    </main>
  );
}
