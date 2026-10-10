import { profile } from "@/data/profile";
import { CvLinks } from "./CvLinks";

export function ContactHeader({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header>
      <p className="eyebrow text-cyan">Contact Station</p>
      <Heading className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</Heading>
    </header>
  );
}

export function ContactContent({ headingLevel = 2, showHeader = true }: { headingLevel?: 1 | 2; showHeader?: boolean }) {
  const links = [
    { label: "GitHub", href: profile.github },
    { label: "LinkedIn", href: profile.linkedin },
    { label: "Email", href: `mailto:${profile.email}` },
  ];
  return (
    <article>
      {showHeader && <ContactHeader headingLevel={headingLevel} />}
      <p className="mt-4 text-base leading-relaxed text-muted">
        {profile.name} · {profile.role} · {profile.location}
      </p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="btn btn-secondary" target="_blank" rel="noreferrer noopener">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <CvLinks className="mt-4" />
      <p className="mt-4 text-sm text-muted">{profile.email}</p>
    </article>
  );
}
