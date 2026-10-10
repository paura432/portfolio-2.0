import type { District } from "@/data/districts";
import { getProject } from "@/data/projects";
import { ContactContent } from "./ContactContent";
import { ProfileContent } from "./ProfileContent";
import { ProjectContent } from "./ProjectContent";

/** Picks the right content for a district: profile, project or contact. */
export function DistrictBody({ district, headingLevel = 2 }: { district: District; headingLevel?: 1 | 2 }) {
  if (district.kind === "hub") return <ProfileContent headingLevel={headingLevel} />;
  if (district.kind === "contact") return <ContactContent headingLevel={headingLevel} />;
  const project = district.projectSlug ? getProject(district.projectSlug) : undefined;
  if (!project) return <p className="text-muted">Content pending.</p>;
  return <ProjectContent project={project} headingLevel={headingLevel} />;
}
