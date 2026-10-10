import type { FlowStep, ProjectDecision } from "../projects";

/**
 * 4Geeks Academy — AI Engineering programme. Everything here is backed by the
 * public repositories audited in docs/education/4geeks-content-audit.md; the
 * `evidence` paths point at files in those repositories. No completion,
 * certification or deployment is claimed because none is evidenced.
 */
export type LabStatus = "planned" | "in-progress" | "implemented" | "verified" | "deployed";

export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  implemented: "Implemented",
  verified: "Verified",
  deployed: "Deployed",
};

export interface LabEvidence {
  label: string;
  /** Repository-relative path (rendered as a link into the repository). */
  path: string;
}

export interface Lab {
  /** Also the plot id in the district map and the URL slug. */
  slug: string;
  code: string;
  title: string;
  category: string;
  period: string;
  tagline: string;
  summary: string;
  academicContext: string;
  problem: string;
  objective: string;
  architecture?: FlowStep[];
  stack: string[];
  decisions: ProjectDecision[];
  /** What really exists in the repository. */
  implemented: string[];
  tests: string[];
  difficulties: string[];
  learnings: string[];
  /** Verifiable results (with their evidence). */
  results: string[];
  repo: string;
  demo?: string;
  status: LabStatus;
  statusNote: string;
  evidence: LabEvidence[];
  boundary?: string;
}

export const fourGeeks = {
  institution: "4Geeks Academy",
  programme: "AI Engineering career programme",
  programmeUrl: "https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia",
  period: "September 2026 — now",
  status: "in-progress" as LabStatus,
  statusNote: "Programme in progress: first repositories created on 23 September 2026, latest work on 10 October 2026. No completion or certification is claimed.",
  summary:
    "Applied AI engineering on a fictional company (TrackFlow) and on inherited codebases: context engineering for agents, rules and skills, memory banks, verification trails, containerised stacks and milestone delivery through pull requests.",
  focus: ["AI-assisted development", "Context engineering for coding agents", "Rules, skills and memory banks", "Verification-first delivery", "Containerised full-stack development", "Integrations and automation"],
  differentiation:
    "42 Madrid (north district) covers systems foundations in C, C++ and UNIX. This campus covers the 4Geeks AI Engineering programme: building software with and for AI agents. The two are separate institutions and are presented separately.",
  github: "https://github.com/paura432",
};

const BACK_OFFICE = "https://github.com/paura432/Back-office";
const FIN_DASH = "https://github.com/paura432/ai-eng-financial-dashboard-context-project";

export const labs: Lab[] = [
  {
    slug: "trackflow",
    code: "Lab 01",
    title: "TrackFlow",
    category: "Company project · business context and AI-ready foundations",
    period: "September — October 2026",
    tagline: "A last-mile logistics company chosen as the course-long case; context, memory bank and two first interfaces.",
    summary:
      "TrackFlow is the fictional company briefing assigned by the programme: last-mile logistics and warehousing between Los Angeles and Zaragoza, two warehouse systems that do not share inventory, eight carriers coordinated by hand, returns reviewed one by one. Lab 01 is the choice of that company, the written reasoning behind it and the AI-ready foundations: a memory bank, an agent protocol, a repository rule, a review skill and two static interfaces built from the context.",
    academicContext: "Transversal company project of the AI Engineering programme (4Geeks student template). Milestone merged through PR #1 on 7 October 2026.",
    problem:
      "The briefing describes a fragmented operation: no shared inventory view, manual carrier selection and tracking, returns that represent 18–25 % of the volume and are inspected by hand, support without a unified ticket system.",
    objective:
      "Pick one company for the whole course, justify it, turn its briefing into durable context for coding agents and ship the first user-facing pieces without inventing business data.",
    architecture: [
      { id: "context", label: "CONTEXT.md", note: "single source of truth" },
      { id: "memory", label: "Memory bank", note: "brief · tech · progress" },
      { id: "rules", label: "Rules + review skill", note: ".agents/" },
      { id: "uis", label: "Website + backoffice", note: "uis/" },
      { id: "api", label: "FastAPI /health", note: "services/api" },
    ],
    stack: ["Markdown context", "Memory bank", "Next.js 16", "React 19", "TypeScript", "FastAPI"],
    decisions: [
      {
        decision: "Choose the company whose problems connect",
        why: "Orders, inventory, carriers, tracking and returns are one system, so later milestones build on each other instead of being isolated exercises.",
        tradeOff: "A realistic patchwork (two warehouse systems, an old ERP, undocumented integrations) is harder than a greenfield case.",
      },
      {
        decision: "Keep contradictions in the briefing visible",
        why: "The context names two different CEOs; the memory bank records both instead of guessing.",
        tradeOff: "Some facts stay ambiguous on purpose.",
      },
      {
        decision: "Static interfaces first, no fake data",
        why: "The website and the backoffice show what the context documents; nothing live is pretended.",
        tradeOff: "No business endpoints yet.",
      },
    ],
    implemented: [
      "company-choice.md: the reasoning for TrackFlow and the problems selected (inventory, carriers, returns, support)",
      "Memory bank: projectbrief.md, techContext.md, progress.md",
      "AGENTS.md session and commit protocol; repository-structure rule; pre-commit-review skill",
      "Public website (uis/website) and operations backoffice (uis/backoffice), static, built from the context",
    ],
    tests: ["npm run build on both interfaces and HTTP smoke of / recorded as PASS in progress.md", "Review skill result PASS before each commit"],
    difficulties: ["Separating company choice, solution proposals and what is actually implemented", "Writing public copy from a briefing full of internal detail without exposing it"],
    learnings: ["A memory bank plus an explicit protocol lets an agent resume work without re-reading everything", "Evidence lists per rule make the rules checkable"],
    results: ["Milestone 'AI-ready' delivered and merged (PR #1)", "Two screenshots of the interfaces in docs/screenshots/"],
    repo: BACK_OFFICE,
    status: "implemented",
    statusNote: "Foundations and two static interfaces exist in the repository and were build-verified by the author; business features, auth, persistence and deployment are not implemented. Builds were not re-run for this portfolio.",
    evidence: [
      { label: "Company choice", path: "company-choice.md" },
      { label: "Company context", path: "CONTEXT.md" },
      { label: "Progress log", path: "memory-bank/progress.md" },
      { label: "Website", path: "uis/website/README.md" },
      { label: "Backoffice", path: "uis/backoffice/README.md" },
    ],
    boundary: "TrackFlow is fictional course material; its named staff and figures are not reproduced here. No real company data.",
  },
  {
    slug: "financial-dashboard",
    code: "Lab 02",
    title: "Financial Dashboard",
    category: "Context engineering on an inherited codebase",
    period: "25 September 2026",
    tagline: "Investigate a handed-over React + FastAPI dashboard, record what is verified, derive rules and a memory bank for agents.",
    summary:
      "The programme hands over a working financial-metrics dashboard (React, TypeScript, Vite, Tailwind, Recharts on the front; FastAPI, Pydantic, pytest behind; Docker Compose). The exercise is not to add features but to make the codebase agent-ready: verify how it really runs, write down the engineering findings, turn them into rules and persist a memory bank.",
    academicContext: "4Geeks exercise 'ai-eng-financial-dashboard-context-project' (template by @marcogonzalo); the student's work is the four documented phases on top of the fork.",
    problem:
      "Agents working on an unknown codebase invent facts. The repository needed a verified description of its runtime, contracts and conventions before any change.",
    objective: "Produce a verification trail, derived findings, agent rules and a memory bank that match the repository exactly, marking anything unverified.",
    architecture: [
      { id: "verify", label: "Phase 1 · verification trail", note: "claims ❌→✅, ❓ unverified" },
      { id: "findings", label: "Phase 2 · engineering findings", note: "rule candidates" },
      { id: "rules", label: "Phase 3 · rules", note: "api-contracts · financial-domain · validation" },
      { id: "memory", label: "Phase 4 · memory bank", note: "product · tech-stack · current-status" },
    ],
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Recharts", "Vitest", "FastAPI", "Pydantic", "pytest", "Docker Compose"],
    decisions: [
      {
        decision: "Record corrections, not just conclusions",
        why: "The first agent claim ('.env.example does not exist') was wrong; the trail keeps the claim and the correction.",
        tradeOff: "Longer documents.",
      },
      {
        decision: "Treat FinancialMovement as a shared contract",
        why: "It is defined in both backend/app/routes.py and frontend/src/lib/financial-types.ts; changing one side breaks the other.",
        tradeOff: "Every contract change touches both sides, consumers and tests.",
      },
      {
        decision: "Do not declare a source of truth for the financial formulas",
        why: "Both layers compute KPIs and the repository does not say which one wins; the rule says review both.",
        tradeOff: "Duplication stays until the project decides.",
      },
    ],
    implemented: [
      "verification.md: runtime checks (/health, /api/metrics, /docs HTTP 200; frontend on 5173) and an open timeout through the Vite proxy recorded as unverified",
      "engineering-findings.md: contract consistency, API dependency, duplicated financial calculations, dates/period mismatch, deterministic mock data (seed 42, 360 movements)",
      ".agents/rules: api-contracts, financial-domain, validation",
      "memory-bank: product, tech-stack, current-status",
    ],
    tests: ["Backend route tests and frontend utility tests exist in the template and were referenced as evidence", "Validation rule: npm test / lint / build and pytest per change, plus the full proxy path for integration changes"],
    difficulties: ["A request through the Vite proxy timed out while direct backend requests worked; the cause was left explicitly unverified rather than guessed"],
    learnings: ["Containers being 'Up' is not proof that an integration works", "Findings become rules only when each rule carries its evidence"],
    results: ["Four commits, one per phase, on top of the upstream template"],
    repo: FIN_DASH,
    status: "implemented",
    statusNote: "The documentation deliverable is complete in the fork. The dashboard application itself is the 4Geeks template, not the student's code. Not deployed.",
    evidence: [
      { label: "Verification trail", path: "verification.md" },
      { label: "Engineering findings", path: "engineering-findings.md" },
      { label: "API contract rule", path: ".agents/rules/api-contracts.md" },
      { label: "Current status", path: "memory-bank/current-status.md" },
    ],
    boundary: "Upstream template: 4GeeksAcademy/ai-eng-financial-dashboard-context-project.",
  },
  {
    slug: "back-office",
    code: "Lab 03",
    title: "Back-office",
    category: "Containerised development stack and framework migration",
    period: "9 — 10 October 2026",
    tagline: "Docker Compose for the TrackFlow stack, Vite → Next.js migration of both frontends, Codespaces bootstrap.",
    summary:
      "Second TrackFlow milestone (#infra-40): one Compose stack with a supervised container running the website and the backoffice and a FastAPI service with /health; healthchecks, loopback-only ports, isolated dependency volumes, hot reload under bind mounts; then the migration of both frontends to Next.js 16 App Router with a pixel-identical result.",
    academicContext: "Transversal company project, infrastructure milestone, merged through PR #2 on 10 October 2026.",
    problem: "The template ran nothing: no containers, no API, two Vite apps that the assignment expected as Next.js, a devcontainer with a broken apt source.",
    objective: "A reproducible development stack that starts with one command, with a verified checklist, and the Next.js gap closed without redesigning the interfaces.",
    architecture: [
      { id: "compose", label: "docker compose up", note: "ui + api" },
      { id: "ui", label: "ui container", note: "supervisor · Next.js 3000 / 3001" },
      { id: "proxy", label: "/api/* rewrites", note: "server-only → api:8000" },
      { id: "api", label: "api container", note: "FastAPI /health · uv --frozen" },
    ],
    stack: ["Docker Compose", "Next.js 16.4", "React 19.3", "TypeScript", "FastAPI", "Uvicorn", "uv", "Node supervisor", "GitHub Codespaces"],
    decisions: [
      {
        decision: "One supervised ui container for both frontends",
        why: "Both apps share one image; a Node supervisor propagates signals and stops the other if one exits.",
        tradeOff: "One container to restart when either app changes its dependencies.",
      },
      {
        decision: "Browsers never see Docker DNS names",
        why: "Relative /api/... URLs are rewritten server-side to http://api:8000.",
        tradeOff: "A rewrite layer to maintain per frontend.",
      },
      {
        decision: "Migrate to Next.js only after the Vite stack was verified",
        why: "The gap was recorded as OPEN first, then closed with a pixel comparison against the Vite screens.",
        tradeOff: "Two rounds of verification.",
      },
    ],
    implemented: [
      "docker-compose.yml (ui, api, healthchecks, named volumes, loopback ports), Dockerfiles and dockerignores",
      "FastAPI service with GET /health, pyproject + uv.lock",
      "Both frontends on Next.js 16.4 / React 19.3 App Router; Vite entry points removed",
      "Devcontainer bootstrap (Docker-in-Docker, Corepack, uv --frozen)",
    ],
    tests: [
      "Author's checklist in progress.md: hello-world, compose config/build/up/ps, HTTP 200 on five endpoints, internal DNS, HMR, supervised failure (exit 143), SIGTERM exit 0, compose down",
      "Playwright comparison of six screens at 1440/390/320 px after the migration: 0.0000 % pixel difference (author-run)",
    ],
    difficulties: ["HMR blocked from loopback origins until allowed dev origins were configured", "Keeping React state across reloads is not guaranteed and was documented as such"],
    learnings: ["Healthchecks and exit codes are part of the deliverable", "Evidence screenshots complement executed checks; they do not replace them"],
    results: ["Milestone merged (PR #2)", "Five evidence screenshots indexed in docs/README.md"],
    repo: BACK_OFFICE,
    status: "implemented",
    statusNote: "Development environment only: no authentication, database, TLS or business endpoints; not deployed. Checks were run by the author, not re-run here.",
    evidence: [
      { label: "Stack documentation", path: "README.md" },
      { label: "Compose file", path: "docker-compose.yml" },
      { label: "Verification table", path: "memory-bank/progress.md" },
      { label: "Evidence index", path: "docs/README.md" },
    ],
  },
  {
    slug: "ai-workflow",
    code: "Lab 04",
    title: "AI Engineering Workflow",
    category: "Method · how the labs are built with coding agents",
    period: "September 2026 — now",
    tagline: "Context → rules → skills → verify → memory: the practice behind every lab, as it appears in the repositories.",
    summary:
      "Not a product: the working method used across the programme. Agents start every session by reading the company context, the memory bank and the active rules; changes go through a review skill that answers PASS or FAIL and never commits; claims are verified and corrections are recorded; milestones land as feature branches and pull requests with no merge without authorisation.",
    academicContext: "Cross-cutting practice of the AI Engineering programme, evidenced in the two repositories above.",
    problem: "Agent-assisted work drifts: invented facts, unverified claims, scope creep, undocumented state.",
    objective: "A repeatable loop that keeps agents inside the authorised scope and leaves verifiable traces.",
    architecture: [
      { id: "context", label: "Context", note: "CONTEXT.md · README of the folder" },
      { id: "rules", label: "Rules", note: "scope · evidence · always_active" },
      { id: "skills", label: "Skills", note: "pre-commit-review → PASS / FAIL" },
      { id: "verify", label: "Verify", note: "❌ claim → ✅ correction · ❓ unverified" },
      { id: "memory", label: "Memory bank", note: "brief · tech · progress" },
      { id: "pr", label: "Branch + PR", note: "no merge without authorisation" },
    ],
    stack: ["AGENTS.md", ".agents/rules", ".agents/skills", "memory-bank/", "Git feature branches", "Pull requests"],
    decisions: [
      {
        decision: "Rules carry their evidence",
        why: "Each rule lists the files that justify it, so it can be challenged and updated.",
        tradeOff: "Rules are longer to write.",
      },
      {
        decision: "The review skill never commits",
        why: "Validation and authorisation stay separate; a PASS only says the change is ready for a person or an authorised agent.",
        tradeOff: "One more explicit step per commit.",
      },
      {
        decision: "Unverified stays unverified",
        why: "The proxy timeout in Lab 02 is still recorded as '❓ unverified' rather than explained away.",
        tradeOff: "Open items remain visible in the memory bank.",
      },
    ],
    implemented: [
      "Session protocol and authorisation limits (Back-office/AGENTS.md)",
      "Repository-wide rule with explicit activation and per-rule evidence",
      "Reusable pre-commit-review skill with verifiable acceptance criteria",
      "Memory banks updated per milestone in both repositories",
      "Verification trails and derived findings (Lab 02)",
    ],
    tests: ["Validation rule: tests, lint, build and runtime path per change (Lab 02 .agents/rules/validation.md)"],
    difficulties: ["Keeping the method lightweight enough to follow on every change"],
    learnings: ["Specification-style documents (context, rules) are only useful when they are kept exact; the trail of corrections is what makes them trustworthy"],
    results: ["Two milestones delivered through pull requests with the protocol applied"],
    repo: BACK_OFFICE,
    status: "in-progress",
    statusNote: "A practice, not a finished artefact: it evolves with each lab. A formal spec/plan/tasks document set is not present in the repositories and is not claimed.",
    evidence: [
      { label: "Agent protocol", path: "AGENTS.md" },
      { label: "Repository rule", path: ".agents/rules/trackflow-repository-structure.md" },
      { label: "Review skill", path: ".agents/skills/pre-commit-review/SKILL.md" },
    ],
  },
];

export function getLab(slug: string): Lab | undefined {
  return labs.find((l) => l.slug === slug);
}

/** Link to a file inside the lab's repository (GitHub blob URL on main). */
export function evidenceUrl(lab: Lab, e: LabEvidence): string {
  return `${lab.repo}/blob/main/${e.path}`;
}
