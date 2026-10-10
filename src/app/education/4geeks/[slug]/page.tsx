import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLab, labs } from "@/data/education/fourgeeks";
import { LabContent } from "@/components/portfolio/education/LabContent";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return labs.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const lab = getLab(slug);
  if (!lab) return { title: "Lab" };
  const description = `${lab.code} · ${lab.title} — ${lab.tagline}`;
  return {
    title: `${lab.title} · 4Geeks AI Engineering`,
    description,
    alternates: { canonical: `/education/4geeks/${lab.slug}` },
    openGraph: { title: lab.title, description, type: "article" },
  };
}

export default async function LabPage({ params }: Params) {
  const { slug } = await params;
  const lab = getLab(slug);
  if (!lab) notFound();
  return (
    <SiteFrame>
      <p className="mb-6">
        <Link href="/education/4geeks" className="btn btn-ghost h-9 min-h-0 px-3">
          ← Back to the campus
        </Link>
      </p>
      <LabContent lab={lab} headingLevel={1} />
    </SiteFrame>
  );
}
