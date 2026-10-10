import Link from "next/link";
import { fourGeeks, labs, type Lab } from "@/data/education/fourgeeks";
import { Section } from "../ProjectContent";
import { StatusBadge } from "./StatusBadge";

export function CampusHeader({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header>
      <p className="eyebrow text-violet">AI Engineering · {fourGeeks.institution}</p>
      <Heading className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">4Geeks AI Engineering Campus</Heading>
      <p className="mt-2 text-sm text-muted">
        {fourGeeks.programme} · {fourGeeks.period} · Student
      </p>
      <p className="mt-3">
        <StatusBadge status={fourGeeks.status} />
      </p>
    </header>
  );
}

interface Props {
  headingLevel?: 1 | 2;
  showHeader?: boolean;
  /** In the game panel labs open in place; on pages they are links. */
  onSelectLab?: (slug: string) => void;
}

function LabCard({ lab, onSelect }: { lab: Lab; onSelect?: (slug: string) => void }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="eyebrow text-violet">{lab.code}</span>
        <StatusBadge status={lab.status} />
      </span>
      <span className="mt-1 block text-lg font-semibold leading-tight">{lab.title}</span>
      <span className="mt-1 block text-sm text-muted">{lab.tagline}</span>
    </>
  );
  const cls = "panel block w-full px-4 py-3 text-left hover:border-violet";
  return (
    <li>
      {onSelect ? (
        <button type="button" className={cls} onClick={() => onSelect(lab.slug)} data-testid={`campus-lab-${lab.slug}`}>
          {body}
        </button>
      ) : (
        <Link href={`/education/4geeks/${lab.slug}`} className={cls} data-testid={`campus-lab-${lab.slug}`}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** Campus overview: the programme, how it differs from 42 Madrid, the labs and the links. */
export function CampusContent({ headingLevel = 2, showHeader = true, onSelectLab }: Props) {
  return (
    <article data-testid="campus-content">
      {showHeader && <CampusHeader headingLevel={headingLevel} />}
      <p className="mt-4 text-base leading-relaxed sm:text-[1.05rem]">{fourGeeks.summary}</p>
      <p className="mt-3 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-muted">
        <span className="text-text/80">Status.</span> {fourGeeks.statusNote}
      </p>

      <Section title="Labs · verified projects">
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="campus-labs">
          {labs.map((lab) => (
            <LabCard key={lab.slug} lab={lab} onSelect={onSelectLab} />
          ))}
        </ul>
      </Section>

      <Section title="What the programme trains">
        <ul className="flex flex-wrap gap-2">
          {fourGeeks.focus.map((t) => (
            <li key={t} className="rounded-md border border-line px-2 py-1 text-xs">
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Not to be confused with 42 Madrid">
        <p className="text-muted">{fourGeeks.differentiation}</p>
      </Section>

      <Section title="Links">
        <ul className="flex flex-wrap gap-3">
          <li>
            <a href={fourGeeks.programmeUrl} className="btn btn-secondary" target="_blank" rel="noreferrer noopener">
              Programme ↗
            </a>
          </li>
          <li>
            <a href={fourGeeks.github} className="btn btn-ghost" target="_blank" rel="noreferrer noopener">
              GitHub ↗
            </a>
          </li>
        </ul>
      </Section>
    </article>
  );
}
