"use client";

import Link from "next/link";
import { getDistrict } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { DistrictBody } from "@/components/portfolio/DistrictBody";
import { Dialog } from "./Dialog";

/** In-game content panel. Driving is blocked while it is open (store phase = "panel"). */
export function ProjectPanel() {
  const id = useGameStore((s) => s.openDistrict);
  const closePanel = useGameStore((s) => s.closePanel);
  if (!id) return null;
  const district = getDistrict(id);

  return (
    <Dialog title={district.name} onClose={closePanel} testId="project-panel">
      <DistrictBody district={district} />
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={closePanel} data-testid="panel-close">
          Back to the road
        </button>
        <Link href={district.route} className="btn btn-secondary">
          Open as page
        </Link>
      </div>
    </Dialog>
  );
}
