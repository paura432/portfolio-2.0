import { CanvasTexture, SRGBColorSpace } from "three";
import { palette } from "./palette";

export interface LabelOptions {
  title: string;
  subtitle?: string;
  accent: string;
  /** Smaller panel for direction signs. */
  compact?: boolean;
}

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Renders a district sign into a canvas texture. Self-contained (no font or
 * image downloads), so the scene has zero external assets. High contrast:
 * near-black panel, accent bar, bold white title.
 */
export function makeLabelTexture({ title, subtitle, accent, compact = false }: LabelOptions): CanvasTexture {
  const w = compact ? 768 : 1024;
  const h = compact ? 224 : 300;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#070E1A";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = compact ? 6 : 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = accent;
  ctx.fillRect(30, 36, compact ? 10 : 14, h - 72);

  const titleSize = compact ? 78 : 104;
  const subSize = compact ? 34 : 44;
  ctx.fillStyle = palette.text;
  ctx.font = `800 ${titleSize}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(title.toUpperCase(), compact ? 66 : 80, subtitle ? h * 0.38 : h / 2);

  if (subtitle) {
    ctx.fillStyle = "#C9D6E3";
    ctx.font = `500 ${subSize}px ${FONT}`;
    ctx.fillText(subtitle, compact ? 66 : 80, h * 0.74);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
