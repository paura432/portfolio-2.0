import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { seededRandom } from "./seededRandom";

export interface SurfaceOptions {
  base: string;
  /** Speckle colour and density (0..1). */
  speckle?: { color: string; density: number; size?: number };
  /** Faint grid lines every `step` pixels (panel seams). */
  grid?: { color: string; step: number; width?: number };
  size?: number;
  seed?: number;
}

/**
 * Small procedural surface tile (noise + optional seams) rendered to a canvas.
 * Keeps the scene asset-free while breaking up large flat colour fields.
 */
export function makeSurfaceTexture({ base, speckle, grid, size = 256, seed = 7 }: SurfaceOptions): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const rand = seededRandom(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  if (speckle) {
    const count = Math.floor(size * size * speckle.density);
    const s = speckle.size ?? 1;
    ctx.fillStyle = speckle.color;
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = 0.25 + rand() * 0.5;
      ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), s, s);
    }
    ctx.globalAlpha = 1;
  }

  if (grid) {
    ctx.strokeStyle = grid.color;
    ctx.lineWidth = grid.width ?? 1;
    ctx.beginPath();
    for (let p = 0; p <= size; p += grid.step) {
      ctx.moveTo(p + 0.5, 0);
      ctx.lineTo(p + 0.5, size);
      ctx.moveTo(0, p + 0.5);
      ctx.lineTo(size, p + 0.5);
    }
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
