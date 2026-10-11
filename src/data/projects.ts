/**
 * Project content. Only verified information about Pau Ramos' work.
 * Sources and verification notes live in docs/content-audit.md.
 * Where details are missing they are listed under `pending` (internal only,
 * never rendered publicly) and are not invented.
 */
export type ProjectSlug = "duplex" | "ovi" | "broki" | "trustos" | "42-madrid";

export interface ProjectDecision {
  decision: string;
  why: string;
  tradeOff: string;
}

/** One step of a public, conceptual system flow (labels only, no private topology). */
export interface FlowStep {
  id: string;
  label: string;
  note?: string;
}

/** Public-safe media. Files must exist under public/ and be approved for publication. */
export interface ProjectMedia {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
}

export interface Project {
  slug: ProjectSlug;
  title: string;
  chapter: string;
  organisation: string;
  period: string;
  role: string;
  /** One line used in cards, menus and page metadata. */
  tagline: string;
  summary: string;
  challenge?: string;
  /** Verified technical highlights, public-safe. */
  highlights: string[];
  /** Conceptual flow rendered as a diagram in the case study. */
  flow?: FlowStep[];
  delivered: string[];
  technologies: string[];
  decisions: ProjectDecision[];
  quality: string[];
  media: ProjectMedia[];
  /** Public-safe boundary: what is intentionally not disclosed. */
  boundary?: string;
  confidential?: boolean;
  /** Internal tracking of missing information. Rendered only in internal/dev views. */
  pending: string[];
}

export const projects: Project[] = [
  {
    slug: "duplex",
    title: "DUPLEX",
    chapter: "AI technical operations",
    organisation: "Performanze",
    period: "2026 — now",
    role: "Technical lead, SAT module",
    tagline: "Field-service (SAT) module that helps elevator technicians diagnose and track faults.",
    summary:
      "The SAT (technical service) module of DUPLEX supports elevator technicians while they diagnose and track faults. Diagnosis adapts to the type of equipment in front of the technician and draws on the manuals, diagnostic steps and case history relevant to that intervention, retrieved through RAG with embeddings and a vector database. A system, not a chatbot: every assisted answer carries its sources.",
    challenge:
      "Keep technical diagnosis grounded in equipment context and traceable sources.",
    highlights: [
      "Equipment context is explicit state during a diagnostic session",
      "Manuals, checklists and case history are retrieved as evidence before an answer",
      "Each assisted answer carries the sources it relies on",
      "Escalation keeps the gathered context",
      "Client meetings and live demos feed each product iteration",
    ],
    flow: [
      { id: "equipment", label: "Equipment context", note: "active during the session" },
      { id: "retrieval", label: "Retrieval", note: "manuals · checklists · history" },
      { id: "diagnosis", label: "Assisted diagnosis", note: "source-backed" },
      { id: "trace", label: "Trace", note: "sources follow the answer" },
      { id: "escalation", label: "Escalation", note: "context preserved" },
    ],
    delivered: ["SAT assistant workflow", "Source-backed diagnosis", "Escalation context"],
    technologies: ["TypeScript", "React", "Next.js", "Supabase", "PostgreSQL", "RAG", "Embeddings", "Vector database"],
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
    media: [],
    boundary: "No manuals, customer data, equipment records or private integrations.",
    pending: ["Usage metrics and measurable outcomes", "Approved public screenshots"],
  },
  {
    slug: "ovi",
    title: "OVI",
    chapter: "AI productivity system",
    organisation: "Performanze",
    period: "2026 — now",
    role: "Full Stack Product Engineer",
    tagline: "Conversational assistant for Microsoft 365: mail, meetings, files and documents from one chat.",
    summary:
      "OVI lets people work with Microsoft 365 from a chat: check email, meetings and conversations, work with SharePoint and OneDrive files, and create Word, Excel and PowerPoint documents without switching applications. Each request is routed to an explicit action with the context it needs; Microsoft Graph connects the assistant to Microsoft 365 and Gamma is used for presentation generation. A private, current system; this public description stays conceptual.",
    challenge: "Turn work requests into reliable actions across Microsoft 365 context.",
    highlights: [
      "Microsoft Graph surfaces: Outlook, Teams, Calendar, OneDrive and SharePoint",
      "Structured routing: every action has explicit intent and context",
      "Short- and long-term conversation memory plus semantic retrieval (embeddings) recover what earlier messages and conversations established",
      "Artifact generation integrated into the workflow, including presentations through Gamma",
    ],
    flow: [
      { id: "request", label: "Work request" },
      { id: "context", label: "Microsoft 365 context", note: "Graph surfaces" },
      { id: "routing", label: "Structured routing", note: "intent + context" },
      { id: "retrieval", label: "Semantic retrieval", note: "when relevant" },
      { id: "artifact", label: "Action / artifact" },
    ],
    delivered: [
      "AI-assisted productivity workflows",
      "Microsoft 365 context integration",
      "Artifact generation integration",
    ],
    technologies: ["React", "Supabase", "Microsoft Graph", "Embeddings", "Gamma"],
    decisions: [
      {
        decision: "Structured product routing",
        why: "Actions need explicit intent and context.",
        tradeOff: "More contracts than a pure chat interface.",
      },
      {
        decision: "Conversation memory is selective",
        why: "Follow-ups need the current context; earlier conversations are recovered by meaning when they matter, not replayed wholesale.",
        tradeOff: "Useful context must be selected rather than retained indiscriminately.",
      },
      {
        decision: "Semantic context is retrieved when relevant",
        why: "Embeddings can recover related knowledge by meaning, not only exact keywords.",
        tradeOff: "Retrieved context remains a supporting input, not an automatic action.",
      },
    ],
    quality: ["Husky pre-commit gates", "Playwright browser checks", "Public-safe conceptual demo"],
    media: [],
    boundary: "No tenant data, credentials, private payloads or exact architecture. Conceptual public architecture only.",
    confidential: true,
    pending: ["Public technology list beyond the core stack", "Usage metrics", "Approved public screenshots"],
  },
  {
    slug: "broki",
    title: "BROKI",
    chapter: "Airport operations platform",
    organisation: "Independent product",
    period: "2026",
    role: "Independent product engineering",
    tagline: "Airport ground operations platform replacing a legacy dashboard and automation stack.",
    summary:
      "Operational platform for airport ground operations: fleet, GSE, tools, personnel, planning, incidents and operational traceability. Built as the modern replacement for a legacy dashboard and automation stack, with the migration verified through parity audits and cutover and rollback runbooks.",
    challenge:
      "Model airport ground operations in one coherent platform while keeping legacy records and flows operationally meaningful during the transition.",
    highlights: [
      "Operational domains as one system: fleet, GSE, tooling, personnel, planner, incidents, inventory",
      "Supabase Edge Functions per domain, Row Level Security and realtime updates",
      "PWA delivery for operational use",
      "Legacy-vs-modern parity audit, data audits and cutover / rollback runbooks for the migration",
      "Pre-commit gate: install, lint, type check, unit, integration and E2E",
    ],
    flow: [
      { id: "legacy", label: "Legacy dashboard + automations", note: "source of truth before" },
      { id: "audit", label: "Data audit + parity", note: "per operation" },
      { id: "platform", label: "Next.js + Supabase platform", note: "Edge Functions · RLS · Realtime" },
      { id: "ops", label: "Operations UI (PWA)", note: "fleet · GSE · personnel · planner" },
      { id: "cutover", label: "Cutover / rollback", note: "runbooks" },
    ],
    delivered: [
      "Airport operations platform",
      "Operational resource workflows",
      "PWA and realtime interfaces",
      "Migration parity audits and cutover runbooks",
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
        decision: "Legacy transition as a parallel, audited track",
        why: "Existing records and flows must keep operational meaning until each operation is proven at parity.",
        tradeOff: "Audit, normalization and dual operation add delivery complexity.",
      },
    ],
    quality: ["Husky pre-commit gate", "Unit, integration and E2E coverage", "Offline smoke checks"],
    media: [],
    boundary: "No airport name, customer data, production records or private workflows.",
    pending: ["Deployment status and public demo link", "Approved public screenshots"],
  },
  {
    slug: "trustos",
    title: "TrustOS",
    chapter: "Digital identity infrastructure",
    organisation: "Telefónica Tech",
    period: "2025 — 2026",
    role: "Software Developer",
    tagline: "Verifiable credential infrastructure across issuance, wallets and verification.",
    summary:
      "TrustOS issues and verifies digital credentials that people store and present from different wallets. Frontend and backend work on the VCS Core API: a unified REST layer for the credential lifecycle, provider integration, wallet flows and QR verification.",
    challenge: "Provide a coherent credential lifecycle across identity providers.",
    highlights: [
      "Unified REST API documented with OpenAPI",
      "Provider abstraction over PrivadoID, Procivis and Idenfy",
      "Credential lifecycle: issuance, wallet flows, verification",
      "QR-based verification flows",
    ],
    flow: [
      { id: "issuer", label: "Issuance" },
      { id: "api", label: "VCS Core API", note: "REST · OpenAPI" },
      { id: "providers", label: "Provider abstraction", note: "PrivadoID · Procivis · Idenfy" },
      { id: "wallet", label: "Wallet flows" },
      { id: "verify", label: "Verification", note: "QR" },
    ],
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
    media: [],
    boundary: "No tenant data, credentials, provider configuration or private infrastructure.",
    pending: ["Team size and scope of individual ownership", "Approved public diagrams"],
  },
  {
    slug: "42-madrid",
    title: "42 Madrid",
    chapter: "Engineering foundations",
    organisation: "42 Madrid (Fundación Telefónica)",
    period: "2023 — now",
    role: "Student",
    tagline: "C, C++, UNIX, graphics, concurrency and networking foundations.",
    summary: "Systems foundations built project by project: memory, algorithms, processes, threads, graphics and networking.",
    highlights: [
      "Memory / C: libft, ft_printf, get_next_line",
      "Algorithms: push_swap",
      "UNIX / processes: pipex, minishell",
      "Concurrency: philosophers",
      "Graphics: so_long, cub3d",
      "Networking: net_practice",
      "Object oriented: C++ modules 00 → 08",
    ],
    delivered: [],
    technologies: ["C", "C++", "UNIX", "Makefile"],
    decisions: [],
    quality: [],
    media: [],
    pending: ["Current cursus level and completed common core status", "Public repository links per project"],
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
