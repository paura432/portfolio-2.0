/**
 * PAU WORLD palette (V3 art direction). Single source for 3D materials and CSS tokens.
 *
 * Rules: large surfaces must differ by at least two steps of value (terrain vs
 * sidewalk vs asphalt), accents are reserved for light-emitting elements, and
 * saturation is kept low on anything that is not a light.
 */
export const palette = {
  // Atmosphere
  background: "#080F1D",
  horizon: "#122238",

  // Terrain and urban ground
  ground: "#142538",
  groundDeep: "#0C1829",
  turf: "#163338",
  turfLight: "#1C4044",
  sidewalk: "#223652",
  sidewalkLight: "#2C4466",
  curb: "#3B5272",
  road: "#0E1826",
  roadLine: "#5A7AA0",
  roadLineDim: "#2C425C",
  crosswalk: "#B8C8DA",

  // Architecture
  building: "#24394F",
  buildingDark: "#1C2E42",
  buildingLight: "#2F4760",
  concrete: "#3A4B5F",
  concreteLight: "#4C5F75",
  roof: "#182838",
  metal: "#55687E",
  metalDark: "#2C3846",
  glass: "#1B3A52",
  glassLit: "#8ED7E6",
  windowDark: "#101D2E",
  windowWarm: "#FFD4A6",
  windowCool: "#BFEFF4",

  // Accents (emissive)
  cyan: "#4DD5DE",
  cyanDeep: "#1F8F99",
  amber: "#FFAE70",
  amberDeep: "#E0803A",
  red: "#FF4A3D",
  /** Secondary accent reserved for the 4Geeks campus emitters (V5). */
  violet: "#8B7CFF",
  violetDeep: "#5B4FD6",

  // Vehicle
  carOrange: "#FF7A3D",
  carOrangeDark: "#C9521E",
  carDark: "#1A1F2B",
  carGlass: "#1C3348",
  carTrim: "#6A7A8E",
  carRim: "#9AA8B8",

  // Vegetation
  tree: "#1F5A5E",
  treeDark: "#174347",
  treeTeal: "#236B62",
  treeGreen: "#2C7A55",
  treeBlue: "#1E4F6B",
  trunk: "#3A2F2A",

  // UI
  text: "#F4F7FA",
  muted: "#9BAFC2",
} as const;

/** Hex for a district accent (menu, minimap and signs share it). */
export const accentHex = { cyan: palette.cyan, amber: palette.amber, violet: palette.violet } as const;
