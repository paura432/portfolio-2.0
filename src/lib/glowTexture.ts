import { CanvasTexture, SRGBColorSpace } from "three";

/** Radial gradient disc used for fake light pools and soft glows. */
export function makeGlowTexture(size = 128, inner = "rgba(255,255,255,0.9)", outer = "rgba(255,255,255,0)"): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
