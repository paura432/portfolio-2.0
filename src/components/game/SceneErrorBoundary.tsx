"use client";

import Link from "next/link";
import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Catches renderer failures (context loss, shader errors) and keeps the HTML portfolio reachable. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error("[PAU WORLD] 3D scene failed:", error);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6" role="alert">
          <div className="panel max-w-md p-8 text-center">
            <h1 className="text-xl font-semibold">The 3D world could not start</h1>
            <p className="mt-3 text-sm text-muted">
              Your browser reported a rendering error. The portfolio is still available as a regular page.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/projects" className="btn btn-primary">
                View projects
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
