import { profile } from "@/data/profile";

export function ProfileContent({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <article>
      <p className="text-[0.65rem] tracking-[0.3em] text-cyan uppercase">Central Hub</p>
      <Heading className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{profile.name}</Heading>
      <p className="mt-1 text-sm text-muted">
        {profile.role} · {profile.location}
      </p>
      <p className="mt-4 text-base leading-relaxed">{profile.summary}</p>

      <section className="mt-6">
        <h3 className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">Experience</h3>
        <ul className="mt-2 space-y-3 text-sm">
          {profile.experience.map((e) => (
            <li key={e.organisation} className="grid gap-0.5 sm:grid-cols-[7rem_1fr]">
              <span className="text-muted">{e.period}</span>
              <span>
                <span className="font-medium">{e.organisation}</span> · {e.role}
                <span className="block text-muted">{e.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">Capabilities</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {profile.capabilities.map((c) => (
            <li key={c.area} className="grid gap-0.5 sm:grid-cols-[11rem_1fr]">
              <span className="font-medium">{c.area}</span>
              <span className="text-muted">{c.items}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
