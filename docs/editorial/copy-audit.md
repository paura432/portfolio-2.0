# PAU WORLD · copy audit

Editorial branch `editorial/copy-review` (worktree `~/pau/portfolio-editorial`), base `4445ce0` (V8 phase 4 on `feat/v8-seamless-transformations`, the latest branch with the complete professional content and the current game mechanics). Scope: content, translations and microcopy only; no physics, 3D, vehicles or functional data. State in `copy-review-state.json`.

## Sources

| id | source | use |
|---|---|---|
| CV-EN / CV-ES | `~/pau/portfolio-pau/public/cv-en.pdf`, `cv-es.pdf` (text extracted) | roles, periods, scope of work per project, skills, education, languages |
| CODE | `src/data/{profile,projects,districts,archipelago,skyport}.ts`, `src/data/education/fourgeeks.ts`, HUD and page components | what is published and which mechanics exist |
| AUDIT-S2 | `docs/content-audit.md` (sprint 02) and `docs/education/4geeks-content-audit.md` | earlier verification with per-claim sources |
| REPOS | `github.com/paura432/{Back-office,ai-eng-financial-dashboard-context-project}` (as audited in AUDIT-S2) | 4Geeks labs |

Not available: metrics, outcomes, team sizes, customer names, deployment URLs (unchanged: none are claimed).

## Inventory (where the public text lives)

| screen / route | file | language |
|---|---|---|
| Intro (home, before the 3D city) | `src/components/hud/IntroScreen.tsx`, `src/data/profile.ts` | EN |
| HUD, legends, prompts, banners, notices | `src/components/hud/{Hud,VehiclePrompt,TouchControls,Minimap}.tsx` | EN |
| Projects menu, project and lab panels, island panel | `src/components/hud/{ProjectsMenu,ProjectPanel,PoiPanel,Dialog}.tsx` | EN |
| Loading, context loss, WebGL fallback, 404 | `src/components/game/GameShell.tsx`, `src/components/hud/WebGLFallback.tsx`, `src/app/not-found.tsx` | EN |
| /projects, /projects/[slug], /education/4geeks, /contact | `src/app/**/page.tsx`, `src/components/portfolio/**` | EN |
| Project content | `src/data/projects.ts` | EN |
| Profile (hub, contact, intro) | `src/data/profile.ts` | EN |
| Districts (names, taglines, signs) | `src/data/districts.ts` | EN |
| 4Geeks campus and labs | `src/data/education/fourgeeks.ts` | EN |
| In-world signs | `src/data/{archipelago,skyport}.ts` taglines, `SignPanel` callers | EN |
| Metadata, Open Graph, preview alt | `src/app/layout.tsx`, `src/lib/site.ts`, page `metadata` | EN |

The site has one language, English. Spanish exists only in the CV (`cv-es.pdf`, not bundled: `profile.cv.*.available = false`). Consistency ES/EN is therefore checked between the two CVs and the site (roles, periods, organisations, scope): no contradiction found.

## Iteration 1 · 2026-10-11

### Defects found and fixed

| id | sev | where | before → after | evidence / why |
|---|---|---|---|---|
| E1 | P0 | Skyport sign (`skyport.ts` tagline) | "Transform for flight" → "Runway · launch ramp · landing strip" | V8 removed the pad transformation (press E); the island now has a ramp and a landing strip (`docs/architecture/v8-transformable-vehicle.md`) |
| E2 | P0 | Island panel (`PoiPanel.tsx`) | "Reachable only by boat, from PAU Harbor." → "Reachable only by sea: drive into the water off any beach and the car becomes a boat."; "No land vehicle lives here: cast off to sail back to the city." → "No beach to drive out on: cast off and sail back to the city." | V8: there is no boat to board at the harbor; the sea is entered from a beach; the island has no beach |
| E3 | P0 | Pier signs (`archipelago.ts` harbor taglines) | "Boats to the archipelago" → "Pier and moorings"; "Boats to the aerial district" → "Moorings at the aerial district" | no boats are provided anymore; piers are moorings |
| E4 | P1 | Profile summary (intro, hub, contact, site description) | "Product engineering across AI-assisted workflows, operational platforms and digital identity infrastructure." → "I take B2B products from definition to production across frontend, backend, data and integrations, and work directly with clients to shape and validate each iteration. Lately: AI-assisted workflows, operational platforms and digital identity." | CV-EN professional profile; the old line named domains, not what Pau does |
| E5 | P1 | Profile: 42 Madrid listed under Experience | moved to a new Education list with 4Geeks (in progress) and ASIR (ITEP, 2020–2022); `ProfileContent.tsx` renders it (component change: one new section, no logic) | brief: learning and professional work must not mix; CV-EN/ES Education section |
| E6 | P1 | DUPLEX tagline, summary, role, highlights, district sign | "SAT" unexplained and the domain hidden → "Field-service (SAT) module that helps elevator technicians diagnose and track faults"; summary names the equipment-dependent diagnosis, manuals, steps and history retrieved through RAG with embeddings and a vector database; role "Technical lead, SAT module"; highlight on client meetings and live demos; sign "Elevator field service · assisted diagnosis"; technologies + Embeddings, Vector database | CV-EN/ES DUPLEX bullets (public in the CV) |
| E7 | P1 | OVI tagline, summary, memory highlight and decision | abstract "AI-assisted productivity system on Microsoft 365 context" → the chat scope (email, meetings, conversations, SharePoint/OneDrive files, Word/Excel/PowerPoint), routing to explicit actions, Graph and Gamma, short- and long-term memory plus semantic retrieval | CV-EN/ES OVI bullets; the earlier decision text ("not permanent memory") was reconciled with the CV's "short- and long-term memory" as selective memory |
| E8 | P1 | TrustOS summary | adds "frontend and backend" and the wallet/QR scope in plain words | CV-EN/ES |
| E9 | P1 | Intro, 3D explanation | adds "Speed up a ramp to fly; drive into the sea off a beach to sail." | the V8 mechanics are implemented on the base branch and have no public explanation |
| E10 | P2 | Capabilities | "AI & knowledge" → "AI & retrieval" with vector databases, semantic retrieval and LangChain; new "Languages" line | CV skills and languages (recruiter-relevant) |
| E11 | P2 | Touch buttons (`TouchControls.tsx`) | accessible names follow the body: Climb / Descend / Bank in the air, Throttle afloat (component change: a store read for the names, no input logic) | the four buttons drive every body; screen readers said "Accelerate" in flight |
| E12 | P2 | 42 Madrid organisation | "42 Madrid" → "42 Madrid (Fundación Telefónica)" | CV |

### Reviewed and left as they are
Intro CTAs ("Explore the 3D city", "View projects", "Contact"), WebGL fallback, context-loss notice, 404 ("Off the map"), projects menu, BROKI copy (already reconciled with the BROKI checkout in AUDIT-S2 and consistent with the CV's end-to-end scope), 4Geeks campus and the four labs (per-claim evidence in `docs/education/4geeks-content-audit.md`; status wording explicit), HUD legends per state (each matches a real mechanic of the base branch), minimap labels, page metadata.

### Three readings
- Recruiter: role, location, what he builds and for whom are now on the first screen; experience and education are separate lists; contact is one click. Open: no CV download (files exist in the previous portfolio but publishing them is the owner's call).
- Senior engineer: DUPLEX and OVI now state the problem, the mechanism (retrieval with sources, routing to explicit actions, selective memory) and the trade-offs; no metric is claimed anywhere; BROKI's legacy migration is backed by runbooks and parity audits (AUDIT-S2). Open: TrustOS has one decision only; the CV does not give more, so none was added.
- UX editor: every screen reads in one language and one voice; game prompts name the key and the outcome. Open: touch users get no written hint that ramps fly and beaches sail beyond the intro line (the HUD legend is hidden under `sm`); left for iteration 2 to check on a phone viewport.

### Validation
typecheck, lint, unit tests: see state file. Build: pending (run after the V8 perf capture on the same machine finishes, to keep its numbers clean).

### Pending
- CV PDFs: NEEDS USER INPUT (publish `cv-es.pdf` / `cv-en.pdf` from the previous portfolio?).
- Spanish UI: none exists; adding one is out of this loop's scope (components, routing).
- Iteration 2: re-read every edited text cold; phone viewport check of the HUD legends; project pages end to end in the browser.

Decision: continue (iteration 2).

## Iteration 2 · 2026-10-11

Cold re-read of every text edited in iteration 1 (profile, DUPLEX, OVI, TrustOS, intro line, island panel, pier and Skyport signs, touch names) and of the texts left as they were.

| id | sev | where | before → after | why |
|---|---|---|---|---|
| E13 | P1 | OVI summary (iteration 1 wording) | "A private system in production use; public description is conceptual." → "A private, current system; this public description stays conceptual." | "in production use" was not in any source; the CV says current work, nothing about production. Kept the verifiable wording. |
| E14 | P2 | HUD mode badge | "Flight mode" while the wings are still deploying on the ground (and "Car mode" while they fold) → "Transforming" during the four transformation states | the capture `high-04-wings-deploying` shows "FLIGHT MODE · 65 km/h · alt 0 m" on the approach; the badge now names what is happening (HUD-only change, no mechanic touched) |

Kept after the re-read: the first-person summary (natural under the name on a personal site; the meta description inherits it after "Pau Ramos, Full Stack Product Engineer." and still reads), the Education list, the DUPLEX and TrustOS summaries, the capabilities (LangChain is a CV skill, not a project claim: no project text mentions it), the intro's ramp/beach line, the 4Geeks lab texts (per-claim evidence already in `docs/education/4geeks-content-audit.md`; status wording explicit).

Three readings, second pass: recruiter — nothing new; senior engineer — OVI no longer implies a production claim; UX editor — the badge no longer contradicts the altitude readout.

Open items: O1 (phone hints) closed as accepted: on phones the legend is hidden by design to keep the horizon clear; the intro names the ramp and beach mechanics, the mode badge and the transformation banners stay visible, and the touch buttons are named per body. O2 (CV PDFs) and O3 (Spanish UI) unchanged.

Validation: typecheck clean, lint 0 problems, 221/221 unit tests, build clean (18 routes). Browser (`scripts/visual-qa/copycheck.mjs`, SwiftShader): intro, /projects, /projects/duplex, /projects/ovi, /contact, /education/4geeks, the projects menu, the hub panel and the car HUD at 1280 px and 390 px: no element with overflowing text on any of the 18 screens; full-page screenshots in `docs/editorial/screens/`.

Decision: one more pass is required by the stop rule (two consecutive passes without important findings); iteration 2 found one P1 of its own making (E13). Continue.

## Iteration 3 · 2026-10-11

Pass over the texts not yet critiqued in depth: the three focus cards (intro and hub), the /projects listing description, the HUD legends per state, the 4Geeks lab texts (grammar and attribution spot-check), the page metadata.

| id | sev | where | before → after | why |
|---|---|---|---|---|
| E15 | P2 | Focus cards (`profile.focus`, intro + hub) | "Retrieval, embeddings and source-traceable assistance for technical and productivity work." → "Assistants that retrieve manuals, case history and Microsoft 365 context and answer with their sources: elevator fault diagnosis (DUPLEX), work from one chat (OVI)."; "Supabase, PostgreSQL, Edge Functions and realtime interfaces for real operations." → "Airport ground operations in one system (fleet, equipment, people, planning, incidents), migrated off a legacy stack with parity audits and runbooks (BROKI)."; "Verifiable credential lifecycle APIs across identity providers." → "Issuing and verifying credentials that live in wallets, through one REST API over several identity providers (TrustOS)." | the cards listed technologies, not what the systems do; each new line names the system that proves it (CV, AUDIT-S2 for BROKI's parity audits and runbooks) |
| E16 | P2 | /projects meta description | "...DUPLEX, OVI, BROKI, TrustOS and 42 Madrid, readable..." → "Pau Ramos's work (DUPLEX, OVI, BROKI, TrustOS) and training (42 Madrid, the 4Geeks AI campus), readable without the 3D city." | 42 Madrid was listed as a project; the 4Geeks campus was missing |

No P0 or P1 found in this pass. HUD legends: each names a key and a real outcome of the base branch (deploy speed and takeoff speed are read from the rules, not typed). 4Geeks labs: attribution stays explicit (template vs student work, "author-run" checks, nothing deployed or certified).

Three readings: recruiter — the focus cards now say what was built and for whom; senior engineer — no new claim beyond the CV and the earlier audits; UX editor — the listing description matches the page's grouping.

Validation: typecheck clean, lint 0 problems, 221/221 unit tests. Build and browser re-check: deferred to the next tick (the V8 capture is using the machine); the changed texts are two short strings in places already checked for overflow with longer text.

Decision: first pass without P0/P1 findings (1 of the 2 required). Continue.

## Iteration 4 · 2026-10-11

Consistency pass over every public string: spelling variant (the copy is British: organisation, containerised, authorisation, colour), double spaces, stray punctuation, capitalisation of product names, key names in the HUD.

| id | sev | where | before → after | why |
|---|---|---|---|---|
| E17 | P2 | BROKI decision trade-off; BROKI district sign | "normalization" → "normalisation"; "legacy modernization" → "legacy modernisation" | the only two American spellings left among the public strings |

No P0 or P1 found: second consecutive pass without important findings. No double spaces or stray punctuation; product names (DUPLEX, OVI, BROKI, TrustOS, PAU WORLD, AERO-X) are consistent; HUD key names match the bindings (`KEY_BINDINGS`).

Three readings: recruiter — nothing new; senior engineer — nothing new; UX editor — nothing new.

Validation: typecheck clean, lint 0 problems, 221/221 unit tests. Build and browser re-check for iterations 3–4: still deferred (the V8 capture is using the machine); they are the only open validation before the loop can stop.

Decision: the copy criteria are met (two clean passes, no open P0/P1, no contradiction with the CVs or the audits, no removed mechanic described, CTAs and game messages checked). The final build and browser check run on the next tick; if clean, the loop stops as SATISFACTORY.
