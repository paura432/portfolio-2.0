import type { Metadata } from "next";
import { fourGeeks } from "@/data/education/fourgeeks";
import { CampusContent } from "@/components/portfolio/education/CampusContent";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

export const metadata: Metadata = {
  title: "4Geeks AI Engineering Campus",
  description: `${fourGeeks.programme} at ${fourGeeks.institution}: TrackFlow, Financial Dashboard, Back-office and the AI engineering workflow, with real status and repositories.`,
  alternates: { canonical: "/education/4geeks" },
};

/** Server-rendered campus page. Works with no JavaScript and no WebGL. */
export default function CampusPage() {
  return (
    <SiteFrame>
      <CampusContent headingLevel={1} />
    </SiteFrame>
  );
}
