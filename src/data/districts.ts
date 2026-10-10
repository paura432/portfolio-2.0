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
  | "contact";

export type DistrictKind = "hub" | "project" | "contact";

export interface District {
  id: DistrictId;
  name: string;
  /** Short descriptor shown under the district name. */
  tagline: string;
  kind: DistrictKind;
  projectSlug?: ProjectSlug;
  /** Building centre on the XZ plane. */
  position: [x: number, z: number];
  /** Axis-aligned footprint (width along X, depth along Z) used for collisions. */
  footprint: [w: number, d: number];
  /** Point in front of the building, on the road, where the interaction prompt triggers. */
  entrance: [x: number, z: number];
  interactRadius: number;
  accent: "cyan" | "amber";
  /** HTML route for the content (works without WebGL). */
  route: string;
  /** Built in the current phase. Unbuilt districts exist as data and menu entries only. */
  built: boolean;
}

export const districts: District[] = [
  {
    id: "hub",
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
    name: "DUPLEX",
    tagline: "AI technical operations · SAT",
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
    name: "OVI",
    tagline: "AI productivity · integrations",
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
    name: "BROKI",
    tagline: "Airport operations platform",
    kind: "project",
    projectSlug: "broki",
    position: [28, 17],
    footprint: [14, 12],
    entrance: [28, 3],
    interactRadius: 9,
    accent: "amber",
    route: "/projects/broki",
    built: false,
  },
  {
    id: "trustos",
    name: "TrustOS",
    tagline: "Digital identity · credentials",
    kind: "project",
    projectSlug: "trustos",
    position: [-28, 17],
    footprint: [14, 14],
    entrance: [-28, 3],
    interactRadius: 9,
    accent: "cyan",
    route: "/projects/trustos",
    built: false,
  },
  {
    id: "fortytwo",
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
    built: false,
  },
  {
    id: "contact",
    name: "Contact Station",
    tagline: "GitHub · LinkedIn · email",
    kind: "contact",
    position: [0, 57],
    footprint: [12, 8],
    entrance: [0, 47],
    interactRadius: 8,
    accent: "cyan",
    route: "/contact",
    built: false,
  },
];

export const builtDistricts = districts.filter((d) => d.built);

export function getDistrict(id: DistrictId): District {
  const d = districts.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown district: ${id}`);
  return d;
}
