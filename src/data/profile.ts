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
    "Product engineering across AI-assisted workflows, operational platforms and digital identity infrastructure.",
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
    {
      period: "2023 — now",
      organisation: "42 Madrid",
      role: "Engineering foundations",
      note: "C, C++, UNIX, graphics, concurrency and networking.",
    },
  ],
  capabilities: [
    { area: "Product engineering", items: "TypeScript · React · Next.js · Vite" },
    {
      area: "Backend & data",
      items:
        "Node.js · Express · Supabase · PostgreSQL · MongoDB · Edge Functions · Realtime · RLS",
    },
    { area: "AI & knowledge", items: "RAG · document retrieval · embeddings · LLM integration" },
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
  ],
  /** CV files are not bundled in this phase. Marked pending on purpose. */
  cv: { status: "pending" as const, note: "CV download links pending for this phase." },
} as const;
