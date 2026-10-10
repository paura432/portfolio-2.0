/**
 * Project content. Only verified information about Pau Ramos' work.
 * Where details are missing they are listed under `pending`, never invented.
 */
export type ProjectSlug = "duplex" | "ovi" | "broki" | "trustos" | "42-madrid";

export interface ProjectDecision {
  decision: string;
  why: string;
  tradeOff: string;
}

export interface Project {
  slug: ProjectSlug;
  title: string;
  chapter: string;
  organisation: string;
  period: string;
  role: string;
  summary: string;
  challenge?: string;
  delivered: string[];
  technologies: string[];
  decisions: ProjectDecision[];
  quality: string[];
  /** Public-safe boundary: what is intentionally not disclosed. */
  boundary?: string;
  confidential?: boolean;
  /** Information that is known to be missing. Rendered as "pending". */
  pending: string[];
}

export const projects: Project[] = [
  {
    slug: "duplex",
    title: "DUPLEX",
    chapter: "AI technical operations",
    organisation: "Performanze",
    period: "2026 — now",
    role: "Technical leadership on SAT module",
    summary:
      "Technical service workflows that join equipment context, retrieval and traceable assisted diagnosis.",
    challenge:
      "Keep technical diagnosis grounded in equipment context and traceable sources.",
    delivered: ["SAT assistant workflow", "Source-backed diagnosis", "Escalation context"],
    technologies: ["TypeScript", "React", "Next.js", "Supabase", "PostgreSQL", "RAG"],
    decisions: [
      {
        decision: "Evidence before diagnosis",
        why: "Technical answers need manuals, checklists and history.",
        tradeOff: "More explicit source handling than generic chat.",
      },
      {
        decision: "Equipment context is active state",
        why: "The current equipment determines which technical evidence is relevant.",
        tradeOff: "Context must remain explicit throughout a diagnostic session.",
      },
      {
        decision: "Trace follows the answer",
        why: "Technicians need to distinguish supported guidance from a generic suggestion.",
        tradeOff: "Sources and their public-safe boundaries need visible handling.",
      },
    ],
    quality: ["Husky pre-commit gates", "Playwright browser checks", "Public-safe sanitized reconstruction"],
    boundary: "No manuals, customer data, equipment records or private integrations.",
    pending: ["Usage metrics and measurable outcomes"],
  },
  {
    slug: "ovi",
    title: "OVI",
    chapter: "AI productivity system",
    organisation: "Performanze",
    period: "2026 — now",
    role: "Full Stack Product Engineer",
    summary: "Private current system for AI-assisted productivity workflows.",
    challenge: "Turn work requests into reliable actions across Microsoft 365 context.",
    delivered: [
      "AI-assisted productivity workflows",
      "Microsoft 365 context integration",
      "Artifact generation integration",
    ],
    technologies: ["React", "Supabase", "Microsoft Graph"],
    decisions: [
      {
        decision: "Structured product routing",
        why: "Actions need explicit intent and context.",
        tradeOff: "More contracts than a pure chat interface.",
      },
      {
        decision: "Conversation state stays bounded",
        why: "Follow-up work needs current context without treating every interaction as permanent memory.",
        tradeOff: "Useful context must be selected rather than retained indiscriminately.",
      },
      {
        decision: "Semantic context is retrieved when relevant",
        why: "Embeddings can recover related knowledge by meaning, not only exact keywords.",
        tradeOff: "Retrieved context remains a supporting input, not an automatic action.",
      },
    ],
    quality: ["Husky pre-commit gates", "Playwright browser checks", "Public-safe conceptual demo"],
    boundary: "No tenant data, credentials, private payloads or exact architecture.",
    confidential: true,
    pending: ["Public technology list beyond the core stack", "Usage metrics"],
  },
  {
    slug: "broki",
    title: "BROKI",
    chapter: "Airport operations platform",
    organisation: "Independent product",
    period: "2026",
    role: "Independent product engineering",
    summary:
      "Operational platform for airport ground operations, connecting fleet, GSE, tools, personnel and operational traceability.",
    challenge: "Model airport ground operations in one coherent operational platform.",
    delivered: [
      "Airport operations platform",
      "Operational resource workflows",
      "PWA and realtime interfaces",
    ],
    technologies: [
      "Next.js",
      "TypeScript",
      "Supabase",
      "PostgreSQL",
      "Edge Functions",
      "RLS",
      "Realtime",
      "PWA",
      "Playwright",
    ],
    decisions: [
      {
        decision: "Operational domains as one system",
        why: "Fleet, GSE, tools and personnel share operational state.",
        tradeOff: "Requires clear domain relations and access boundaries.",
      },
      {
        decision: "Legacy transition as secondary work",
        why: "Existing records must keep operational meaning.",
        tradeOff: "Audit and normalization add delivery complexity.",
      },
    ],
    quality: ["Husky pre-commit gate", "Unit, integration and E2E coverage", "Offline smoke checks"],
    boundary: "No airport name, customer data, production records or private workflows.",
    pending: ["Deployment status and public demo link"],
  },
  {
    slug: "trustos",
    title: "TrustOS",
    chapter: "Digital identity infrastructure",
    organisation: "Telefónica Tech",
    period: "2025 — 2026",
    role: "Software Developer",
    summary:
      "Verifiable credential infrastructure across issuance, wallets and verification.",
    challenge: "Provide a coherent credential lifecycle across identity providers.",
    delivered: [
      "Credential lifecycle services",
      "Provider integrations",
      "QR verification flows",
      "OpenAPI documentation",
    ],
    technologies: ["Node.js", "Express", "TypeScript", "MongoDB", "Docker", "OpenAPI"],
    decisions: [
      {
        decision: "Provider abstraction",
        why: "Credential flows need a consistent product contract.",
        tradeOff: "Provider differences remain a system constraint.",
      },
    ],
    quality: ["Infrastructure-level public model"],
    boundary: "No tenant data, credentials, provider configuration or private infrastructure.",
    pending: ["Team size and scope of individual ownership"],
  },
  {
    slug: "42-madrid",
    title: "42 Madrid",
    chapter: "Engineering foundations",
    organisation: "42 Madrid",
    period: "2023 — now",
    role: "Student",
    summary: "C, C++, UNIX, graphics, concurrency and networking foundations.",
    delivered: [
      "Memory / C: libft, ft_printf, get_next_line",
      "Algorithms: push_swap",
      "UNIX / processes: pipex, minishell",
      "Concurrency: philosophers",
      "Graphics: so_long, cub3d",
      "Networking: net_practice",
      "Object oriented: C++ modules 00 → 08",
    ],
    technologies: ["C", "C++", "UNIX", "Makefile"],
    decisions: [],
    quality: [],
    pending: ["Current cursus level and completed common core status"],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
