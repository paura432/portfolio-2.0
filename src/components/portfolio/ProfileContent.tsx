import { profile } from "@/data/profile";
import { CvLinks } from "./CvLinks";

interface Props {
  headingLevel?: 1 | 2;
  showHeader?: boolean;
}

export function ProfileHeader({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header>
      <p className="eyebrow text-cyan">Central Hub</p>
      <Heading className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{profile.name}</Heading>
      <p className="mt-2 text-sm text-muted">
        {profile.role} · {profile.location}
      </p>
    </header>
  );
}

export function ProfileContent({ headingLevel = 2, showHeader = true }: Props) {
  return (
    <article>
      {showHeader && <ProfileHeader headingLevel={headingLevel} />}
      <p className="mt-4 text-base leading-relaxed sm:text-[1.05rem]">{profile.summary}</p>

      <section className="mt-7">
        <h3 className="eyebrow">Focus</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {profile.focus.map((f) => (
            <li key={f.title} className="rounded-lg border border-line bg-white/[0.02] p-3">
              <p className="font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h3 className="eyebrow">Experience</h3>
        <ul className="mt-2 space-y-3 text-[0.95rem]">
          {profile.experience.map((e) => (
            <li key={e.organisation} className="grid gap-0.5 sm:grid-cols-[7.5rem_1fr]">
              <span className="text-muted">{e.period}</span>
              <span>
                <span className="font-medium">{e.organisation}</span> · {e.role}
                <span className="block text-muted">{e.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h3 className="eyebrow">Capabilities</h3>
        <ul className="mt-2 space-y-2 text-[0.95rem]">
          {profile.capabilities.map((c) => (
            <li key={c.area} className="grid gap-0.5 sm:grid-cols-[11rem_1fr]">
              <span className="font-medium">{c.area}</span>
              <span className="text-muted">{c.items}</span>
            </li>
          ))}
        </ul>
      </section>

      <CvLinks className="mt-7" />
    </article>
  );
}
