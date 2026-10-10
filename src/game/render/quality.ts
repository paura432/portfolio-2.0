/** Quality tiers: what each tier renders. Buildings are never hidden; only cost is traded. */
export type Quality = "high" | "medium" | "low";

export interface QualityProfile {
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  /** Car headlight spot light (one dynamic shadow-less light). */
  headlight: boolean;
  /** Translucent light pools under street lamps. */
  lampPools: boolean;
  /** Fraction of the decorative vegetation that is rendered. */
  vegetation: number;
  /** Ambient animation (core pulse, ring rotation). */
  ambientMotion: boolean;
  /** Impact/driving particle budget as a fraction of the high-tier pools (0 = none). */
  particles: number;
  /** Canopy sway and skid marks. */
  worldFx: boolean;
}

export const QUALITY_PROFILES: Record<Quality, QualityProfile> = {
  high: { maxDpr: 1.5, shadows: true, shadowMapSize: 2048, headlight: true, lampPools: true, vegetation: 1, ambientMotion: true, particles: 1, worldFx: true },
  medium: { maxDpr: 1.25, shadows: true, shadowMapSize: 1024, headlight: true, lampPools: true, vegetation: 0.8, ambientMotion: true, particles: 0.5, worldFx: true },
  low: { maxDpr: 1, shadows: false, shadowMapSize: 512, headlight: false, lampPools: false, vegetation: 0.55, ambientMotion: false, particles: 0, worldFx: false },
};

export const QUALITY_ORDER: Quality[] = ["high", "medium", "low"];

export function lowerQuality(q: Quality): Quality {
  const i = QUALITY_ORDER.indexOf(q);
  return QUALITY_ORDER[Math.min(i + 1, QUALITY_ORDER.length - 1)] ?? "low";
}

export function nextQuality(q: Quality): Quality {
  const i = QUALITY_ORDER.indexOf(q);
  return QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length] ?? "high";
}

export const QUALITY_LABEL: Record<Quality, string> = { high: "High", medium: "Medium", low: "Low" };
