"use client";

import { getHarbor, getIsland, getPoi } from "@/data/archipelago";
import { useGameStore } from "@/stores/gameStore";
import { Dialog } from "./Dialog";

/**
 * Island point-of-interest panel (V6). The first island is an experimental
 * territory: the panel says so plainly instead of inventing professional
 * content, and proves the sail → dock → explore → cast off loop end to end.
 */
export function PoiPanel() {
  const id = useGameStore((s) => s.openPoi);
  const closePanel = useGameStore((s) => s.closePanel);
  if (!id) return null;
  const poi = getPoi(id);
  const island = getIsland(poi.island);
  const harbor = getHarbor(poi.harbor);

  return (
    <Dialog
      label={poi.name}
      header={
        <div>
          <p className="eyebrow text-amber">{island.name}</p>
          <h2 className="mt-1 text-2xl font-semibold">{poi.name}</h2>
          <p className="mt-1 text-sm text-muted">{poi.tagline}</p>
        </div>
      }
      onClose={closePanel}
      testId="poi-panel"
      footer={
        <button type="button" className="btn btn-primary" onClick={closePanel} data-testid="poi-close">
          Back to the pier
        </button>
      }
    >
      <div className="space-y-4 text-sm leading-relaxed text-muted" data-testid="poi-content">
        <p>
          You moored at <strong className="text-text">{harbor.name}</strong>. This island is the first territory outside the city: a small
          experimental site that exists to prove the archipelago can grow without rebuilding the world.
        </p>
        <p>
          Its content is not written yet. Nothing here describes real work or real results; when the island gets a purpose, this
          panel will carry it.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Status: experimental, content pending.</li>
          <li>Reachable only by boat, from {getHarbor("pau-harbor").name}.</li>
          <li>No land vehicle lives here: cast off to sail back to the city.</li>
        </ul>
      </div>
    </Dialog>
  );
}
