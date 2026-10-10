import { evidenceUrl, type Lab } from "@/data/education/fourgeeks";
import { FlowDiagram } from "../FlowDiagram";
import { Section } from "../ProjectContent";
import { StatusBadge } from "./StatusBadge";

export function LabHeader({ lab, headingLevel = 2 }: { lab: Lab; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header>
      <p className="eyebrow text-violet">
        {lab.code} · 4Geeks AI Engineering
      </p>
      <Heading className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{lab.title}</Heading>
      <p className="mt-2 text-sm text-muted">
        {lab.category} · {lab.period}
      </p>
      <p className="mt-3">
        <StatusBadge status={lab.status} />
      </p>
    </header>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/**
 * Case study of one lab, shared by the campus panel and the HTML route.
 * Order: tagline → summary → status note → context → problem → objective →
 * architecture → implemented → stack → decisions → tests → difficulties →
 * learnings → results → evidence → repository → boundary.
 */
export function LabContent({ lab, headingLevel = 2, showHeader = true }: { lab: Lab; headingLevel?: 1 | 2; showHeader?: boolean }) {
  return (
    <article data-testid={`lab-${lab.slug}`}>
      {showHeader && <LabHeader lab={lab} headingLevel={headingLevel} />}
      <p className="mt-4 text-base leading-relaxed sm:text-[1.05rem]">{lab.tagline}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{lab.summary}</p>
      <p className="mt-3 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-muted">
        <span className="text-text/80">Status.</span> {lab.statusNote}
      </p>

      <Section title="Academic context">{lab.academicContext}</Section>
      <Section title="Problem">{lab.problem}</Section>
      <Section title="Objective">{lab.objective}</Section>

      {lab.architecture && lab.architecture.length > 0 && (
        <Section title="Architecture">
          <FlowDiagram steps={lab.architecture} />
        </Section>
      )}

      <Section title="What exists in the repository">
        <List items={lab.implemented} />
      </Section>

      <Section title="Stack">
        <ul className="flex flex-wrap gap-2">
          {lab.stack.map((t) => (
            <li key={t} className="rounded-md border border-line px-2 py-1 text-xs">
              {t}
            </li>
          ))}
        </ul>
      </Section>

      {lab.decisions.length > 0 && (
        <Section title="Decisions">
          <ul className="space-y-3">
            {lab.decisions.map((d) => (
              <li key={d.decision} className="rounded-lg border border-line p-3">
                <p className="font-medium">{d.decision}</p>
                <p className="mt-1 text-muted">
                  <span className="text-text/80">Why.</span> {d.why}
                </p>
                <p className="text-muted">
                  <span className="text-text/80">Trade-off.</span> {d.tradeOff}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Tests and checks">
        <List items={lab.tests} />
      </Section>
      <Section title="Difficulties">
        <List items={lab.difficulties} />
      </Section>
      <Section title="Learnings">
        <List items={lab.learnings} />
      </Section>
      <Section title="Verifiable results">
        <List items={lab.results} />
      </Section>

      <Section title="Evidence">
        <ul className="grid gap-2 sm:grid-cols-2">
          {lab.evidence.map((e) => (
            <li key={e.path}>
              <a href={evidenceUrl(lab, e)} className="block rounded-lg border border-line px-3 py-2 hover:border-violet" target="_blank" rel="noreferrer noopener">
                <span className="block text-sm">{e.label}</span>
                <span className="block truncate font-mono text-xs text-muted">{e.path}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Repository">
        <a href={lab.repo} className="btn btn-secondary" target="_blank" rel="noreferrer noopener" data-testid={`lab-repo-${lab.slug}`}>
          GitHub ↗
        </a>
        {lab.demo && (
          <a href={lab.demo} className="btn btn-ghost ml-2" target="_blank" rel="noreferrer noopener">
            Demo ↗
          </a>
        )}
      </Section>

      {lab.boundary && (
        <Section title="Boundary">
          <p className="text-muted">{lab.boundary}</p>
        </Section>
      )}
    </article>
  );
}
