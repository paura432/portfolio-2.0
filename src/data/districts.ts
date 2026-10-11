import type { ProjectSlug } from "./projects";

/**
 * District map. The same data drives visuals, collisions, proximity zones and
 * navigation menus, so the layout is reproducible from this single file.
 *
 * Coordinates are world units on the XZ plane (Y is up). +X is east, +Z is south.
 */
export type DistrictId =
  | "hub"
  | "duplex"
  | "ovi"
  | "broki"
  | "trustos"
  | "fortytwo"
  | "fourgeeks"
  | "contact";

export type DistrictKind = "hub" | "project" | "education" | "contact";

/** How the menu and the pages group districts; never mixes learning with professional work. */
export type DistrictCategory = "hub" | "experience" | "personal" | "education" | "ai-engineering" | "contact";

export type Accent = "cyan" | "amber" | "violet";

/**
 * A secondary building inside a district (e.g. a campus lab). Collides like a
 * building; with an `entrance` it also gets its own small interaction zone.
 */
export interface Plot {
  id: string;
  name: string;
  position: [x: number, z: number];
  footprint: [w: number, d: number];
  entrance?: [x: number, z: number];
  interactRadius?: number;
}

export interface District {
  id: DistrictId;
  name: string;
  /** Short descriptor shown under the district name. */
  tagline: string;
  kind: DistrictKind;
  category: DistrictCategory;
  projectSlug?: ProjectSlug;
  /** Building centre on the XZ plane. */
  position: [x: number, z: number];
  /** Axis-aligned footprint (width along X, depth along Z) used for collisions. */
  footprint: [w: number, d: number];
  /** Point in front of the building, on the road, where the interaction prompt triggers. */
  entrance: [x: number, z: number];
  interactRadius: number;
  accent: Accent;
  /** Extra buildings of a composite district (campus labs). */
  plots?: Plot[];
  /** HTML route for the content (works without WebGL). */
  route: string;
  /** Built on the map (collisions, interaction zone, sign). All districts are built since V3. */
  built: boolean;
}

export const districts: District[] = [
  {
    id: "hub",
    category: "hub",
    name: "Central Hub",
    tagline: "Pau Ramos · Full Stack Product Engineer",
    kind: "hub",
    position: [0, 0],
    footprint: [10, 10],
    entrance: [0, 11],
    interactRadius: 6.5,
    accent: "cyan",
    route: "/projects",
    built: true,
  },
  {
    id: "duplex",
    category: "experience",
    name: "DUPLEX",
    tagline: "Elevator field service · assisted diagnosis",
    kind: "project",
    projectSlug: "duplex",
    position: [-28, -17],
    footprint: [14, 12],
    entrance: [-28, -3],
    interactRadius: 9,
    accent: "amber",
    route: "/projects/duplex",
    built: true,
  },
  {
    id: "ovi",
    category: "experience",
    name: "OVI",
    tagline: "AI productivity · Microsoft 365",
    kind: "project",
    projectSlug: "ovi",
    position: [28, -17],
    footprint: [14, 14],
    entrance: [28, -3],
    interactRadius: 9,
    accent: "cyan",
    route: "/projects/ovi",
    built: true,
  },
  {
    id: "broki",
    category: "personal",
    name: "BROKI",
    tagline: "Airport operations · legacy modernisation",
    kind: "project",
    projectSlug: "broki",
    position: [28, 17],
    footprint: [14, 12],
    entrance: [28, 3],
    interactRadius: 9,
    accent: "amber",
    route: "/projects/broki",
    built: true,
  },
  {
    id: "trustos",
    category: "experience",
    name: "TrustOS",
    tagline: "Digital identity · verifiable credentials",
    kind: "project",
    projectSlug: "trustos",
    position: [-28, 17],
    footprint: [14, 14],
    entrance: [-28, 3],
    interactRadius: 9,
    accent: "cyan",
    route: "/projects/trustos",
    built: true,
  },
  {
    id: "fortytwo",
    category: "education",
    name: "42 Madrid",
    tagline: "Engineering foundations",
    kind: "project",
    projectSlug: "42-madrid",
    position: [0, -57],
    footprint: [14, 10],
    entrance: [0, -47],
    interactRadius: 8,
    accent: "amber",
    route: "/projects/42-madrid",
    built: true,
  },
  {
    id: "fourgeeks",
    category: "ai-engineering",
    name: "4Geeks AI Campus",
    tagline: "AI Engineering · applied labs",
    kind: "education",
    position: [30, -57],
    footprint: [12, 10],
    entrance: [30, -47],
    interactRadius: 8,
    accent: "violet",
    route: "/education/4geeks",
    built: true,
    plots: [
      { id: "trackflow", name: "Lab 01 · TrackFlow", position: [15, -57], footprint: [8, 10], entrance: [15, -49.5], interactRadius: 4.5 },
      { id: "financial-dashboard", name: "Lab 02 · Financial Dashboard", position: [44, -57], footprint: [8, 10], entrance: [44, -49.5], interactRadius: 4.5 },
      { id: "back-office", name: "Lab 03 · Back-office", position: [58, -58], footprint: [8, 8], entrance: [51, -58], interactRadius: 4.5 },
      { id: "ai-workflow", name: "Lab 04 · AI Workflow", position: [58, -49], footprint: [8, 6], entrance: [51, -49], interactRadius: 4.5 },
    ],
  },
  {
    id: "contact",
    category: "contact",
    name: "Contact Station",
    tagline: "GitHub · LinkedIn · email",
    kind: "contact",
    position: [0, 57],
    footprint: [12, 8],
    entrance: [0, 47],
    interactRadius: 8,
    accent: "cyan",
    route: "/contact",
    built: true,
  },
];

export const builtDistricts = districts.filter((d) => d.built);

export interface PlotBox {
  id: string;
  position: [number, number];
  footprint: [number, number];
}

/** Every building box on the map: each district's main footprint plus its plots. */
export function allPlots(): PlotBox[] {
  return districts.flatMap((d): PlotBox[] => [
    { id: d.id, position: d.position, footprint: d.footprint },
    ...(d.plots ?? []).map((p) => ({ id: `${d.id}:${p.id}`, position: p.position, footprint: p.footprint })),
  ]);
}

export const CATEGORY_LABEL: Record<DistrictCategory, string> = {
  hub: "Profile",
  experience: "Professional experience",
  personal: "Personal projects",
  education: "Education",
  "ai-engineering": "AI engineering",
  contact: "Contact",
};

export function getDistrict(id: DistrictId): District {
  const d = districts.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown district: ${id}`);
  return d;
}
