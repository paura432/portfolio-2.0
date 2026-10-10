import type { Project } from "@/data/projects";
import { INTERNAL_VIEW } from "@/lib/internal";
import { FlowDiagram } from "./FlowDiagram";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="eyebrow">{title}</h3>
      <div className="mt-2 text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}

export function ProjectHeader({ project, headingLevel = 2 }: { project: Project; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header>
      <p className="eyebrow text-cyan">{project.chapter}</p>
      <Heading className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</Heading>
      <p className="mt-2 text-sm text-muted">
        {project.organisation} · {project.period} · {project.role}
      </p>
      {project.confidential && (
        <p className="mt-3 inline-block rounded-md border border-amber/40 bg-amber/10 px-2 py-1 text-xs text-amber">
          Private system · public-safe description
        </p>
      )}
    </header>
  );
}

interface ProjectContentProps {
  project: Project;
  headingLevel?: 1 | 2;
  /** The in-game panel renders its own header; pages render it here. */
  showHeader?: boolean;
  /** Internal view shows pending-information tracking. Never true in production. */
  internal?: boolean;
}

/**
 * Case-study template shared by the in-game panel and the standalone route.
 * Order: summary → flow diagram → highlights → challenge → decisions → delivered →
 * technologies → quality → media → boundary → (internal) pending.
 */
export function ProjectContent({ project, headingLevel = 2, showHeader = true, internal = INTERNAL_VIEW }: ProjectContentProps) {
  return (
    <article data-testid={`project-${project.slug}`}>
      {showHeader && <ProjectHeader project={project} headingLevel={headingLevel} />}
      <p className="mt-4 text-base leading-relaxed sm:text-[1.05rem]">{project.tagline}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{project.summary}</p>

      {project.flow && project.flow.length > 0 && (
        <Section title="How it works">
          <FlowDiagram steps={project.flow} />
        </Section>
      )}

      {project.highlights.length > 0 && (
        <Section title="Technical highlights">
          <ul className="grid gap-2 sm:grid-cols-2">
            {project.highlights.map((h) => (
              <li key={h} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2">
                {h}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.challenge && <Section title="Challenge">{project.challenge}</Section>}

      {project.decisions.length > 0 && (
        <Section title="Decisions">
          <ul className="space-y-3">
            {project.decisions.map((d) => (
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

      {project.delivered.length > 0 && (
        <Section title="Delivered">
          <ul className="list-disc space-y-1 pl-5">
            {project.delivered.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>
      )}

      {project.technologies.length > 0 && (
        <Section title="Technologies">
          <ul className="flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <li key={t} className="rounded-md border border-line px-2 py-1 text-xs">
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.quality.length > 0 && (
        <Section title="Quality">
          <ul className="list-disc space-y-1 pl-5">
            {project.quality.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Section>
      )}

      {project.media.length > 0 && (
        <Section title="Public captures">
          <ul className="grid gap-3 sm:grid-cols-2">
            {project.media.map((m) => (
              <li key={m.src}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimised asset */}
                  <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading="lazy" className="rounded-lg border border-line" />
                  {m.caption && <figcaption className="mt-1 text-xs text-muted">{m.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.boundary && (
        <Section title="Boundary">
          <p className="text-muted">{project.boundary}</p>
        </Section>
      )}

      {internal && project.pending.length > 0 && (
        <Section title="Internal · pending information">
          <ul className="list-disc space-y-1 pl-5 text-amber" data-testid="pending-internal">
            {project.pending.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
