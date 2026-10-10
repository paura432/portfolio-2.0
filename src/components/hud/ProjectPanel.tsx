"use client";

import Link from "next/link";
import { getDistrict } from "@/data/districts";
import { getLab } from "@/data/education/fourgeeks";
import { useGameStore } from "@/stores/gameStore";
import { DistrictBody, DistrictHeader } from "@/components/portfolio/DistrictBody";
import { CampusContent } from "@/components/portfolio/education/CampusContent";
import { LabContent, LabHeader } from "@/components/portfolio/education/LabContent";
import { Dialog } from "./Dialog";

/** In-game content panel. Driving is blocked while it is open (store phase = "panel"). */
export function ProjectPanel() {
  const id = useGameStore((s) => s.openDistrict);
  const openLab = useGameStore((s) => s.openLab);
  const selectLab = useGameStore((s) => s.selectLab);
  const closePanel = useGameStore((s) => s.closePanel);
  if (!id) return null;
  const district = getDistrict(id);
  const lab = district.kind === "education" && openLab ? getLab(openLab) : undefined;
  const route = lab ? `${district.route}/${lab.slug}` : district.route;

  return (
    <Dialog
      label={lab ? `${lab.code} ${lab.title}` : district.name}
      header={lab ? <LabHeader lab={lab} /> : <DistrictHeader district={district} />}
      onClose={closePanel}
      testId="project-panel"
      footer={
        <>
          {lab && (
            <button type="button" className="btn btn-secondary" onClick={() => selectLab(null)} data-testid="lab-back">
              ← Campus
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={closePanel} data-testid="panel-close">
            Back to the road
          </button>
          <Link href={route} className="btn btn-secondary">
            Open as page
          </Link>
        </>
      }
    >
      {lab ? (
        <LabContent lab={lab} showHeader={false} />
      ) : district.kind === "education" ? (
        <CampusContent showHeader={false} onSelectLab={(slug) => selectLab(slug)} />
      ) : (
        <DistrictBody district={district} showHeader={false} />
      )}
    </Dialog>
  );
}
