import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/projects";
import { ProjectContent } from "@/components/portfolio/ProjectContent";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return { title: project ? project.title : "Project" };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return (
    <SiteFrame>
      <ProjectContent project={project} headingLevel={1} />
    </SiteFrame>
  );
}
