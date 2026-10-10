import type { District } from "@/data/districts";
import { getProject } from "@/data/projects";
import { ContactContent, ContactHeader } from "./ContactContent";
import { ProfileContent, ProfileHeader } from "./ProfileContent";
import { ProjectContent, ProjectHeader } from "./ProjectContent";
import { CampusContent, CampusHeader } from "./education/CampusContent";

interface Props {
  district: District;
  headingLevel?: 1 | 2;
  showHeader?: boolean;
}

/** Picks the right content for a district: profile, project or contact. */
export function DistrictBody({ district, headingLevel = 2, showHeader = true }: Props) {
  if (district.kind === "hub") return <ProfileContent headingLevel={headingLevel} showHeader={showHeader} />;
  if (district.kind === "contact") return <ContactContent headingLevel={headingLevel} showHeader={showHeader} />;
  if (district.kind === "education") return <CampusContent headingLevel={headingLevel} showHeader={showHeader} />;
  const project = district.projectSlug ? getProject(district.projectSlug) : undefined;
  if (!project) return <p className="text-muted">Content pending.</p>;
  return <ProjectContent project={project} headingLevel={headingLevel} showHeader={showHeader} />;
}

/** Header only, used by the panel's sticky top bar. */
export function DistrictHeader({ district, headingLevel = 2 }: { district: District; headingLevel?: 1 | 2 }) {
  if (district.kind === "hub") return <ProfileHeader headingLevel={headingLevel} />;
  if (district.kind === "contact") return <ContactHeader headingLevel={headingLevel} />;
  if (district.kind === "education") return <CampusHeader headingLevel={headingLevel} />;
  const project = district.projectSlug ? getProject(district.projectSlug) : undefined;
  if (!project) return null;
  return <ProjectHeader project={project} headingLevel={headingLevel} />;
}
