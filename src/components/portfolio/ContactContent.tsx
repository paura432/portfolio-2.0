import { profile } from "@/data/profile";

export function ContactContent({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const links = [
    { label: "GitHub", href: profile.github },
    { label: "LinkedIn", href: profile.linkedin },
    { label: "Email", href: `mailto:${profile.email}` },
  ];
  return (
    <article>
      <p className="text-[0.65rem] tracking-[0.3em] text-cyan uppercase">Contact Station</p>
      <Heading className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Get in touch</Heading>
      <p className="mt-4 text-base leading-relaxed text-muted">
        {profile.name} · {profile.location}
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
      <p className="mt-6 text-sm text-muted">{profile.cv.note}</p>
    </article>
  );
}
