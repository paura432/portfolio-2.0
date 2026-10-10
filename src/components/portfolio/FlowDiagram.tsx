import type { CSSProperties } from "react";
import type { FlowStep } from "@/data/projects";

/** Conceptual system flow: labels only, renders as a row on desktop and a column on mobile. */
export function FlowDiagram({ steps, title = "How it works" }: { steps: FlowStep[]; title?: string }) {
  return (
    <figure className="flow" aria-label={title}>
      <ol className="flow-list" style={{ "--flow-count": steps.length } as CSSProperties}>
        {steps.map((s, i) => (
          <li key={s.id} className="flow-step">
            <span className="flow-index" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flow-label">{s.label}</span>
            {s.note && <span className="flow-note">{s.note}</span>}
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-xs text-muted">Conceptual public flow, not private topology.</figcaption>
    </figure>
  );
}
