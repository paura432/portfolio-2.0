import { LAB_STATUS_LABEL, type LabStatus } from "@/data/education/fourgeeks";

const TONE: Record<LabStatus, string> = {
  planned: "border-muted/40 text-muted",
  "in-progress": "border-amber/40 bg-amber/10 text-amber",
  implemented: "border-violet/50 bg-violet/10 text-violet",
  verified: "border-cyan/40 bg-cyan/10 text-cyan",
  deployed: "border-cyan/60 bg-cyan/15 text-cyan",
};

/** Explicit, evidence-based status; "Completed" is never used. */
export function StatusBadge({ status }: { status: LabStatus }) {
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[0.7rem] tracking-[0.12em] uppercase ${TONE[status]}`} data-status={status}>
      {LAB_STATUS_LABEL[status]}
    </span>
  );
}
