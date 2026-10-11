"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { isWebGLAvailable } from "@/lib/webgl";
import { useGameStore } from "@/stores/gameStore";
import { Hud } from "@/components/hud/Hud";
import { IntroScreen } from "@/components/hud/IntroScreen";
import { PoiPanel } from "@/components/hud/PoiPanel";
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
  const contextLost = useGameStore((s) => s.contextLost);
  const started = phase !== "intro";
  const dialogOpen = phase === "panel" || phase === "menu";

  useKeyboardControls(started && support === "ok");

  if (support === "unsupported") return <WebGLFallback />;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      {/* Everything behind a dialog is inert: no focus, no clicks, no screen-reader traversal. */}
      <div inert={dialogOpen} className="absolute inset-0">
        {support === "ok" && started && (
          <SceneErrorBoundary>
            <GameCanvas />
          </SceneErrorBoundary>
        )}

        {started && !sceneReady && !contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg" role="status" aria-live="polite" data-testid="loading">
            <p className="eyebrow">Loading world</p>
          </div>
        )}

        {started && contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/90 p-6" role="alert" data-testid="context-lost">
            <div className="panel max-w-md p-8 text-center">
              <p className="eyebrow text-amber">Graphics interrupted</p>
              <h2 className="mt-2 text-xl font-semibold">The 3D context was lost</h2>
              <p className="mt-3 text-sm text-muted">
                The browser released the graphics context. It usually comes back by itself in a moment. If it does not, reload the page or read the projects as pages.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                  Reload
                </button>
                <Link href="/projects" className="btn btn-secondary">
                  View projects
                </Link>
              </div>
            </div>
          </div>
        )}

        {!started && <IntroScreen checking={support === "checking"} />}
        {started && <Hud />}
      </div>

      {phase === "panel" && <ProjectPanel />}
      {phase === "panel" && <PoiPanel />}
      {phase === "menu" && <ProjectsMenu />}
    </main>
  );
}
