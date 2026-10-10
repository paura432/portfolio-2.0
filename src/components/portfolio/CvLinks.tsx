import { profile } from "@/data/profile";

export function availableCvs() {
  return Object.values(profile.cv).filter((c) => c.available);
}

/** CV download links. Renders nothing until the files are published. */
export function CvLinks({ className = "" }: { className?: string }) {
  const cvs = availableCvs();
  if (cvs.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="CV downloads">
      {cvs.map((c) => (
        <li key={c.href}>
          <a href={c.href} className="btn btn-secondary" download>
            {c.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
