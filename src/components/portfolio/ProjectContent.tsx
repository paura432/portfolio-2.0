import type { Project } from "@/data/projects";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/** Shared project rendering for the in-game panel and the standalone route. */
export function ProjectContent({ project, headingLevel = 2 }: { project: Project; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <article>
      <p className="text-[0.65rem] tracking-[0.3em] text-cyan uppercase">{project.chapter}</p>
      <Heading className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</Heading>
      <p className="mt-1 text-sm text-muted">
        {project.organisation} · {project.period} · {project.role}
      </p>
      {project.confidential && (
        <p className="mt-3 inline-block rounded-md border border-line px-2 py-1 text-xs text-amber">
          Private system · public-safe description only
        </p>
      )}
      <p className="mt-4 text-base leading-relaxed">{project.summary}</p>

      {project.challenge && <Section title="Challenge">{project.challenge}</Section>}

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

      {project.decisions.length > 0 && (
        <Section title="Decisions">
          <ul className="space-y-3">
            {project.decisions.map((d) => (
              <li key={d.decision} className="rounded-lg border border-line p-3">
                <p className="font-medium">{d.decision}</p>
                <p className="mt-1 text-muted">Why: {d.why}</p>
                <p className="text-muted">Trade-off: {d.tradeOff}</p>
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

      {project.boundary && (
        <Section title="Boundary">
          <p className="text-muted">{project.boundary}</p>
        </Section>
      )}

      {project.pending.length > 0 && (
        <Section title="Pending information">
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {project.pending.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
