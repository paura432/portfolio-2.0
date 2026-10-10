import { describe, expect, it } from "vitest";
import { districts } from "../districts";
import { evidenceUrl, fourGeeks, labs } from "./fourgeeks";

/** Repositories verified in docs/education/4geeks-content-audit.md. Nothing else may be linked as 4Geeks work. */
const VERIFIED_REPOS = ["https://github.com/paura432/Back-office", "https://github.com/paura432/ai-eng-financial-dashboard-context-project"];

describe("4Geeks campus content", () => {
  it("has unique lab slugs that match the campus plots on the map", () => {
    const slugs = labs.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const campus = districts.find((d) => d.id === "fourgeeks")!;
    expect(campus.kind).toBe("education");
    expect((campus.plots ?? []).map((p) => p.id).sort()).toEqual([...slugs].sort());
  });
  it("links only verified repositories and real evidence paths", () => {
    for (const l of labs) {
      expect(VERIFIED_REPOS, l.slug).toContain(l.repo);
      expect(l.evidence.length, l.slug).toBeGreaterThan(0);
      for (const e of l.evidence) expect(evidenceUrl(l, e)).toMatch(/^https:\/\/github\.com\/paura432\/[A-Za-z0-9-]+\/blob\/main\/[^ ]+$/);
    }
  });
  it("never claims completion, deployment or certification", () => {
    const text = JSON.stringify({ fourGeeks, labs }).toLowerCase();
    for (const forbidden of ["completed the programme", "certified", "certificate", "graduated", "in production"]) expect(text, forbidden).not.toContain(forbidden);
    for (const l of labs) expect(["planned", "in-progress", "implemented", "verified", "deployed"]).toContain(l.status);
    expect(labs.some((l) => l.status === "deployed")).toBe(false);
    expect(labs.every((l) => l.statusNote.length > 20)).toBe(true);
  });
  it("keeps the course separate from 42 Madrid and the professional projects", () => {
    expect(fourGeeks.differentiation).toMatch(/42 Madrid/);
    const campus = districts.find((d) => d.id === "fourgeeks")!;
    const fortytwo = districts.find((d) => d.id === "fortytwo")!;
    expect(campus.category).toBe("ai-engineering");
    expect(fortytwo.category).toBe("education");
    expect(districts.filter((d) => d.kind === "project" && d.projectSlug !== "42-madrid").every((d) => d.category === "experience" || d.category === "personal")).toBe(true);
  });
});
