import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { profile } from "./profile";
import { projects } from "./projects";

describe("content integrity", () => {
  it("every project has a tagline, highlights and a boundary or an explicit empty quality list", () => {
    for (const p of projects) {
      expect(p.tagline.length, p.slug).toBeGreaterThan(10);
      expect(p.highlights.length, p.slug).toBeGreaterThan(0);
      expect(Array.isArray(p.pending), p.slug).toBe(true);
    }
  });
  it("flow steps have unique ids", () => {
    for (const p of projects) {
      if (!p.flow) continue;
      const ids = p.flow.map((s) => s.id);
      expect(new Set(ids).size, p.slug).toBe(ids.length);
    }
  });
  it("published media files exist under public/", () => {
    for (const p of projects) {
      for (const m of p.media) {
        expect(existsSync(path.join(process.cwd(), "public", m.src)), `${p.slug}: ${m.src}`).toBe(true);
      }
    }
  });
  it("CV links marked available point to real files", () => {
    for (const cv of Object.values(profile.cv)) {
      if (cv.available) expect(existsSync(path.join(process.cwd(), "public", cv.href)), cv.href).toBe(true);
    }
  });
  it("focus areas reference existing projects", () => {
    const slugs = new Set(projects.map((p) => p.slug));
    for (const f of profile.focus) for (const s of f.projects) expect(slugs.has(s), f.title).toBe(true);
  });
  it("the intro preview image exists", () => {
    expect(existsSync(path.join(process.cwd(), "public/preview/city.jpg"))).toBe(true);
  });
});
