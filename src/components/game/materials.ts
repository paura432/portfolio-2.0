import { Color, MeshBasicMaterial, MeshStandardMaterial, type Texture } from "three";
import { palette } from "@/lib/palette";
import { makeSurfaceTexture } from "@/lib/surfaceTexture";

/**
 * Shared material library. One instance per look, reused by every mesh, so the
 * art direction is tuned in one place and the renderer compiles fewer programs.
 * Client-only: created lazily on first use inside the Canvas tree.
 */
interface Extra {
  flatShading?: boolean;
  map?: Texture;
  emissive?: string;
  emissiveIntensity?: number;
}

function standard(color: string, roughness: number, metalness = 0, extra: Extra = {}) {
  const m = new MeshStandardMaterial({ color, roughness, metalness });
  if (extra.flatShading) m.flatShading = true;
  if (extra.map) m.map = extra.map;
  if (extra.emissive) {
    m.emissive = new Color(extra.emissive);
    m.emissiveIntensity = extra.emissiveIntensity ?? 1;
  }
  return m;
}

function emissive(color: string, intensity = 1) {
  const m = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
  m.toneMapped = false;
  return m;
}

function basicLight(color: string) {
  const m = new MeshBasicMaterial({ color });
  m.toneMapped = false;
  return m;
}

function createMaterials() {
  const groundMap: Texture = makeSurfaceTexture({
    base: palette.ground,
    speckle: { color: "#1E3550", density: 0.035, size: 2 },
    grid: { color: "#1A2E46", step: 64 },
    seed: 11,
  });
  groundMap.repeat.set(33, 33);
  const asphaltMap: Texture = makeSurfaceTexture({
    base: palette.road,
    speckle: { color: "#203044", density: 0.05 },
    seed: 23,
  });
  asphaltMap.repeat.set(8, 8);
  const sidewalkMap: Texture = makeSurfaceTexture({
    base: palette.sidewalk,
    speckle: { color: "#3B5270", density: 0.02 },
    grid: { color: "#243850", step: 32 },
    seed: 31,
  });
  sidewalkMap.repeat.set(1, 1);

  return {
    // Ground & urbanism
    ground: standard("#ffffff", 0.95, 0, { map: groundMap }),
    groundDeep: standard(palette.groundDeep, 1),
    asphalt: standard("#ffffff", 0.92, 0, { map: asphaltMap }),
    sidewalk: standard("#ffffff", 0.9, 0, { map: sidewalkMap }),
    curb: standard(palette.curb, 0.85),
    turf: standard(palette.turf, 1, 0, { flatShading: true }),
    turfLight: standard(palette.turfLight, 1, 0, { flatShading: true }),
    roadLine: basicLight(palette.roadLine),
    roadLineDim: basicLight(palette.roadLineDim),
    crosswalk: basicLight(palette.crosswalk),

    // Architecture
    facade: standard(palette.building, 0.85, 0, { flatShading: true }),
    facadeLight: standard(palette.buildingLight, 0.85, 0, { flatShading: true }),
    facadeDark: standard(palette.buildingDark, 0.9, 0, { flatShading: true }),
    concrete: standard(palette.concrete, 0.9, 0, { flatShading: true }),
    concreteLight: standard(palette.concreteLight, 0.9, 0, { flatShading: true }),
    roof: standard(palette.roof, 0.95),
    metal: standard(palette.metal, 0.4, 0.6),
    metalDark: standard(palette.metalDark, 0.5, 0.5),
    glass: standard(palette.glass, 0.15, 0.3, { emissive: palette.cyanDeep, emissiveIntensity: 0.22 }),
    glassAmber: standard("#3A2E22", 0.2, 0.3, { emissive: palette.amberDeep, emissiveIntensity: 0.28 }),
    windowDark: standard(palette.windowDark, 0.3, 0.2),

    // Emissive accents (not tone mapped so they stay saturated)
    lightCyan: basicLight(palette.cyan),
    lightCyanSoft: emissive("#7FE2E9", 0.9),
    lightAmber: basicLight(palette.amber),
    lightAmberSoft: emissive("#FFC58F", 0.9),
    lightWarm: basicLight("#FFF1D6"),
    lightWindowWarm: basicLight(palette.windowWarm),
    lightWindowCool: basicLight(palette.windowCool),
    lightRed: basicLight(palette.red),

    // Vegetation
    trunk: standard(palette.trunk, 1),
    canopy: standard("#ffffff", 0.9, 0, { flatShading: true }),
    bush: standard(palette.treeTeal, 0.95, 0, { flatShading: true }),
    planter: standard(palette.concreteLight, 0.9, 0, { flatShading: true }),

    // Vehicle
    carBody: standard(palette.carOrange, 0.32, 0.12),
    carBodyDark: standard(palette.carOrangeDark, 0.4, 0.1),
    carUnder: standard(palette.carDark, 0.9, 0.1),
    carTrim: standard(palette.carTrim, 0.35, 0.7),
    carGlass: standard("#223C55", 0.1, 0.5, { emissive: "#17304A", emissiveIntensity: 0.55 }),
    carRim: standard(palette.carRim, 0.3, 0.8),
    tire: standard("#141821", 1, 0),
    headlight: basicLight("#FFF6E0"),
    drl: basicLight("#CFF6FA"),
    tailLight: emissive(palette.red, 0.9),
    grille: standard("#0F141C", 0.6, 0.3),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

let cache: Materials | null = null;

/** Lazily created singleton; safe to call from any client component. */
export function getMaterials(): Materials {
  if (!cache) cache = createMaterials();
  return cache;
}
