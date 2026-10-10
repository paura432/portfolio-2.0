import { CanvasTexture, SRGBColorSpace } from "three";
import { palette } from "./palette";

export interface LabelOptions {
  title: string;
  subtitle?: string;
  accent: string;
}

/**
 * Renders a district sign into a canvas texture. Self-contained (no font or
 * image downloads), so the scene has zero external assets.
 */
export function makeLabelTexture({ title, subtitle, accent }: LabelOptions): CanvasTexture {
  const w = 768;
  const h = 224;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = "#0B1728";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = accent;
  ctx.fillRect(28, 40, 10, h - 80);

  ctx.fillStyle = palette.text;
  ctx.font = "700 72px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title.toUpperCase(), 64, subtitle ? 84 : h / 2);

  if (subtitle) {
    ctx.fillStyle = palette.muted;
    ctx.font = "500 34px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(subtitle, 64, 156);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
