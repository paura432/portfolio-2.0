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
}

export const QUALITY_PROFILES: Record<Quality, QualityProfile> = {
  high: { maxDpr: 1.5, shadows: true, shadowMapSize: 2048, headlight: true, lampPools: true, vegetation: 1, ambientMotion: true },
  medium: { maxDpr: 1.25, shadows: true, shadowMapSize: 1024, headlight: true, lampPools: true, vegetation: 0.8, ambientMotion: true },
  low: { maxDpr: 1, shadows: false, shadowMapSize: 512, headlight: false, lampPools: false, vegetation: 0.55, ambientMotion: false },
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
