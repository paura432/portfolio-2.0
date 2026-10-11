/**
 * Professional profile. Every value here is sourced from Pau Ramos' verified
 * portfolio content. Nothing in this file is game logic.
 */
export const profile = {
  name: "Pau Ramos",
  role: "Full Stack Product Engineer",
  location: "Madrid, Spain",
  email: "pauramosimo@gmail.com",
  github: "https://github.com/paura432",
  linkedin: "https://www.linkedin.com/in/pau-ramos-sim%C3%B3-520751202/",
  summary:
    "I take B2B products from definition to production across frontend, backend, data and integrations, and work directly with clients to shape and validate each iteration. Lately: AI-assisted workflows, operational platforms and digital identity.",
  experience: [
    {
      period: "2026 — now",
      organisation: "Performanze",
      role: "Full Stack Product Engineer",
      note: "Current systems: OVI and DUPLEX.",
    },
    {
      period: "2025 — 2026",
      organisation: "Telefónica Tech",
      role: "Software Developer",
      note: "TrustOS and digital identity infrastructure.",
    },
  ],
  /** Learning, kept apart from professional experience. */
  education: [
    {
      period: "2026 — now",
      organisation: "4Geeks Academy",
      role: "AI Engineering programme",
      note: "In progress: context engineering for coding agents, containerised stacks, verification-first delivery.",
    },
    {
      period: "2023 — now",
      organisation: "42 Madrid (Fundación Telefónica)",
      role: "Project-based systems programming",
      note: "C, C++, UNIX, processes, concurrency, graphics and networking.",
    },
    {
      period: "2020 — 2022",
      organisation: "ITEP",
      role: "Advanced Diploma in Networked Computer Systems Administration (ASIR)",
      note: "",
    },
  ],
  capabilities: [
    { area: "Product engineering", items: "TypeScript · React · Next.js · Vite" },
    {
      area: "Backend & data",
      items:
        "Node.js · Express · Supabase · PostgreSQL · MongoDB · Edge Functions · Realtime · RLS",
    },
    { area: "AI & retrieval", items: "RAG · embeddings · vector databases · semantic retrieval · LangChain · LLM integration" },
    {
      area: "APIs & integrations",
      items:
        "Microsoft Graph · Outlook · Teams · Calendar · OneDrive · SharePoint · Gamma · OpenAPI",
    },
    {
      area: "Quality engineering",
      items: "Playwright · unit · integration · acceptance · production smoke · Husky",
    },
    { area: "Systems", items: "C · C++ · UNIX · processes · threads · networking" },
    { area: "Delivery", items: "Docker · Vercel · Git · Linux · Postman" },
    { area: "Languages", items: "Spanish and Catalan (native) · English (intermediate)" },
  ],
  /**
   * What Pau builds, for the intro. Each line is backed by a verified project.
   */
  focus: [
    {
      title: "AI-assisted workflows",
      detail: "Retrieval, embeddings and source-traceable assistance for technical and productivity work.",
      projects: ["duplex", "ovi"],
    },
    {
      title: "Operational platforms",
      detail: "Supabase, PostgreSQL, Edge Functions and realtime interfaces for real operations.",
      projects: ["broki"],
    },
    {
      title: "Digital identity",
      detail: "Verifiable credential lifecycle APIs across identity providers.",
      projects: ["trustos"],
    },
  ],
  /**
   * CV downloads. Links are rendered only when `available` is true, and a unit
   * test checks that an available file really exists under public/.
   * Drop the PDFs at public/cv/<file> and flip the flag.
   */
  cv: {
    es: { label: "CV (español)", href: "/cv/pau-ramos-cv-es.pdf", available: false },
    en: { label: "CV (English)", href: "/cv/pau-ramos-cv-en.pdf", available: false },
  },
} as const;

export type CvEntry = (typeof profile.cv)[keyof typeof profile.cv];
