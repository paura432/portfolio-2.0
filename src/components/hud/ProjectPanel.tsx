"use client";

import Link from "next/link";
import { getDistrict } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { DistrictBody, DistrictHeader } from "@/components/portfolio/DistrictBody";
import { Dialog } from "./Dialog";

/** In-game content panel. Driving is blocked while it is open (store phase = "panel"). */
export function ProjectPanel() {
  const id = useGameStore((s) => s.openDistrict);
  const closePanel = useGameStore((s) => s.closePanel);
  if (!id) return null;
  const district = getDistrict(id);

  return (
    <Dialog
      label={district.name}
      header={<DistrictHeader district={district} />}
      onClose={closePanel}
      testId="project-panel"
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={closePanel} data-testid="panel-close">
            Back to the road
          </button>
          <Link href={district.route} className="btn btn-secondary">
            Open as page
          </Link>
        </>
      }
    >
      <DistrictBody district={district} showHeader={false} />
    </Dialog>
  );
}
