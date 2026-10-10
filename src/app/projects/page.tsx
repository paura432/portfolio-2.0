import Link from "next/link";
import type { Metadata } from "next";
import { districts } from "@/data/districts";
import { ProfileContent } from "@/components/portfolio/ProfileContent";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

export const metadata: Metadata = { title: "Projects" };

/** Server-rendered index. Works with no JavaScript and no WebGL. */
export default function ProjectsPage() {
  const entries = districts.filter((d) => d.kind !== "hub");
  return (
    <SiteFrame>
      <ProfileContent headingLevel={1} />
      <section className="mt-12">
        <h2 className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">Districts</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="projects-list">
          {entries.map((d) => (
            <li key={d.id}>
              <Link href={d.route} className="panel block px-4 py-3 hover:border-cyan">
                <span className="block font-semibold">{d.name}</span>
                <span className="block text-xs text-muted">{d.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteFrame>
  );
}
