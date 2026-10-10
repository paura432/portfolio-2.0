# Content audit · Sprint 02

Date: 2026-10-10. Scope: `src/data/projects.ts`, `src/data/profile.ts`, `src/data/districts.ts`.
Rule applied: a claim is published only if it is backed by one of the sources below. Anything else stays in `pending` (internal) and is not shown publicly.

## Sources
| id | source | type |
|---|---|---|
| S1 | `~/pau/portfolio-pau/app/data/portfolio.ts` | previous portfolio data (read only) |
| S2 | `~/pau/portfolio-pau/docs/portfolio/{project-deep-dive-evidence,technology-evidence,apis-integrations-final-report,final-project-evidence}.md` | previous evidence audits with confidence levels |
| S3 | `~/pau/portfolio-pau/app/work/{duplex,ovi,trustos,broki}/page.tsx` | previous public copy |
| S4 | `~/pau/Broki/` (`supabase/functions/*`, `docs/broki/parity/legacy-vs-modern-final.md`, `docs/broki/release/{cutover-runbook,rollback-runbook}.md`, `.husky/pre-commit` per S2) | BROKI source checkout |

## BROKI: platform vs legacy modernization
Both descriptions are true and the evidence shows how they relate:
- **Airport ground operations platform (primary).** S4 `supabase/functions/` contains domain functions: `aircraft-*`, `tooling-*`, `personnel-*`, `planner-*`, `incidents`, `inventory-list`, `equipment-update`, `roster-upload`, `relays`. S2 marks "fleet, GSE, tooling, personnel, incidents and planning are operational domains" as VERIFIED_CODE.
- **Legacy modernization (real, secondary framing).** S4 `docs/broki/parity/legacy-vs-modern-final.md` is a "Legacy vs Modern" parity audit (legacy static dashboards + automation flows + legacy PostgreSQL → Next.js + Supabase Edge Functions + Realtime), with FULL_PASS / INTENTIONAL_IMPROVEMENT / BLOCKED states per operation. S4 `docs/broki/release/cutover-runbook.md` and `rollback-runbook.md` define the cutover. S2 ("apis-integrations-final-report") already reconciled it as "airport ground operations platform; legacy transition remains a secondary engineering challenge".

Resolution: the published copy leads with the operations platform and states that it replaces a legacy dashboard and automation stack, verified through parity audits and cutover/rollback runbooks. Channel names, legacy hostnames, record counts and automation internals stay private (boundary unchanged).

## Verified additions per project
| project | added | source |
|---|---|---|
| DUPLEX | tagline; "system, not chatbot" framing; equipment context, manuals, checklists, case history; trace follows the answer; escalation keeps context; conceptual flow | S1, S3 |
| OVI | Graph surfaces (Outlook, Teams, Calendar, OneDrive, SharePoint); structured routing; embeddings retrieval; Gamma presentation generation; conceptual flow; technologies += Embeddings, Gamma | S1, S2 (technology-evidence: High), S3 |
| TrustOS | "VCS Core API" unified layer; providers PrivadoID, Procivis, Idenfy; wallet flows; QR verification; conceptual flow | S2 (CV-verified), S3 |
| BROKI | see above; pre-commit gate contents (install, lint, type check, unit, integration, E2E) | S2 (exact), S4 |
| 42 Madrid | highlights = foundations list | S1 |
| profile.focus | three focus areas, each mapped to verified projects | S1 |

## Not claimed (no evidence)
pgvector, LangChain, PPTXGenJS, Automizer, Jest, pytest, project-wide CI for OVI/DUPLEX, lint-staged in BROKI, Microsoft Graph resource identities, metrics or outcomes for any project, team sizes, customer names, deployment URLs.

## Pending (internal, hidden from the public UI)
Kept in each project's `pending` array and rendered only in internal/dev views (`?internal=1` is not implemented on purpose; pending shows in `NODE_ENV=development` through the `internal` prop). Current list:
- DUPLEX: usage metrics and measurable outcomes; approved public screenshots.
- OVI: public technology list beyond the core stack; usage metrics; approved public screenshots.
- BROKI: deployment status and public demo link; approved public screenshots.
- TrustOS: team size and scope of individual ownership; approved public diagrams.
- 42 Madrid: current cursus level / common core status; public repository links per project.
- Profile: CV PDFs (ES/EN) not bundled; links are wired behind `available: false`.

## CV links
`profile.cv.es` → `/cv/pau-ramos-cv-es.pdf`, `profile.cv.en` → `/cv/pau-ramos-cv-en.pdf`, both `available: false`. The contact page and intro render a CV link only when the flag is true; `data.test.ts` fails if a flag is true and the file is missing from `public/cv/`. The previous portfolio holds `cv-es.pdf` / `cv-en.pdf`; they were not copied because the brief forbids reusing that repository's assets without an explicit decision.
