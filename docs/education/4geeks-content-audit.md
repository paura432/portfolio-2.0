# 4Geeks Academy — content audit (V5)

Audit date: 2026-10-10. Sources: the public GitHub account `paura432` (REST API listing of 30 public repositories, READMEs, trees, commit history and raw documentation files). Nothing below comes from private data or from memory; every claim has a file path. Where the evidence stops, the item is marked **NOT VERIFIED**.

## 1. Which repositories belong to the 4Geeks AI Engineering programme

| Repository | Evidence of the 4Geeks link | Verdict |
|---|---|---|
| `paura432/Back-office` (created 2026-09-23, last push 2026-10-10, TypeScript) | README: "AI Engineering Company Project — Student Template … 4Geeks Academy", badges to the 4Geeks AI Engineering programme; `CONTEXT.md`: "AI Engineering · 4Geeks Academy — Briefing de empresa"; `company-choice.md`: "Elección de empresa: TrackFlow" | **4Geeks: yes.** This is the transversal company project. It holds both the *TrackFlow* business work (Lab 01) and the *Back-office / infra* work (Lab 03). |
| `paura432/ai-eng-financial-dashboard-context-project` (fork of `4GeeksAcademy/ai-eng-financial-dashboard-context-project`, forked 2026-09-23, last push 2026-09-25) | Upstream is a 4Geeks exercise ("Practice rules and context generation starting from a previous existing project"); 4 commits by `paura432` on top of the template | **4Geeks: yes.** Lab 02. |
| `paura432/finance-dashboard` (Python/Django, Dec 2025, Railway config, no README) | No 4Geeks reference; predates the programme; Django REST app | **Not 4Geeks.** Excluded. |
| `Crew_Flex`, `Sofia`, `forkcount`, `openclaw-connection`, `portfolio-2.0`, `portfolio-pau` | Personal/professional projects, no 4Geeks reference | Excluded from the campus. |
| `42*` repositories | 42 Madrid cursus | Belong to the existing 42 Madrid district, not to 4Geeks. |

Programme status: both repositories were created on 2026-09-23 and the latest work is dated 2026-10-10, so the programme is **in progress** (started September 2026). No certificate, grade or completion is claimed anywhere in the repositories → none is claimed in the portfolio.

## 2. Lab 01 — TrackFlow (business context and AI-ready milestone)

Repository: https://github.com/paura432/Back-office (branch `main`; milestone merged from `feature/agent-memory-bank`, PR #1, 2026-10-07).

| Item | Evidence | Status |
|---|---|---|
| Company chosen: TrackFlow, last-mile logistics and warehousing (LA + Zaragoza) | `company-choice.md`, `CONTEXT.md` | verified |
| Problems selected by the student: shared inventory across two warehouses, carrier selection/tracking, returns (18–25 % of volume), customer support with RAG | `company-choice.md` | verified (student's own text) |
| Memory bank (`projectbrief.md`, `techContext.md`, `progress.md`), `AGENTS.md` session/commit protocol, repository-structure rule, `pre-commit-review` skill | `memory-bank/*`, `AGENTS.md`, `.agents/rules/trackflow-repository-structure.md`, `.agents/skills/pre-commit-review/SKILL.md` | implemented |
| Public corporate website `uis/website` and operations backoffice `uis/backoffice` (static context dashboard, no live data) | `uis/website/README.md`, `uis/backoffice/README.md`, `memory-bank/progress.md` (builds PASS, commits `83c118f`, `341dca7`), `docs/screenshots/trackflow-website.png`, `trackflow-backoffice.png` | implemented (author-verified builds; **not re-run here**) |
| Business endpoints, auth, persistence, deployment | `memory-bank/progress.md`: "Backend: no implementado"; "API de negocio, auth, persistencia y produccion permanecen fuera del alcance" | not implemented — must not be claimed |

Note for the portfolio: company choice ≠ solution proposal ≠ implemented product. The campus copy keeps the three apart.

## 3. Lab 02 — Financial Dashboard (context engineering on an existing project)

Repository: https://github.com/paura432/ai-eng-financial-dashboard-context-project (fork).

| Item | Evidence | Status |
|---|---|---|
| Stack of the inherited project: React + TypeScript + Vite + Tailwind + Recharts + Vitest; FastAPI + Uvicorn + Pydantic + pytest; Docker Compose (5173 / 8000 / debugpy 5678) | `memory-bank/tech-stack.md`, `docker-compose.yml`, `frontend/package.json`, `backend/requirements.txt` | verified |
| Student deliverables (4 commits, 2026-09-25): phase 1 verification trail, phase 2 engineering findings, phase 3 agent rules (`api-contracts`, `financial-domain`, `validation`), phase 4 memory bank (`product`, `tech-stack`, `current-status`) | `verification.md`, `engineering-findings.md`, `.agents/rules/*.md`, `memory-bank/*.md`, commit list | implemented |
| Runtime checks recorded: `/health`, `/api/metrics`, `/docs` HTTP 200; frontend served; **proxied** `/api/metrics` timed out — cause recorded as "❓ unverified" | `verification.md` §5–6, `memory-bank/current-status.md` | verified as documented (an honest open finding, kept as such) |
| Mock data `generate_mock_movements(seed=42)`, 360 movements, inclusive date filters; backend route tests and frontend utility tests exist | `engineering-findings.md`, `backend/tests/test_routes.py`, `frontend/src/lib/financial-utils.test.ts` | verified (template code by 4Geeks; the student's contribution is the documentation/rules layer) |

The application code is the 4Geeks template by @marcogonzalo; the campus presents the student's work as what it is: investigation, rules and memory for an inherited codebase.

## 4. Lab 03 — Back-office (containerised development stack)

Repository: https://github.com/paura432/Back-office (milestone merged from `feature/infra-40-containerization`, PR #2, 2026-10-10).

| Item | Evidence | Status |
|---|---|---|
| Docker Compose with `ui` (one supervised container running both Next.js apps on 3000/3001) and `api` (FastAPI `/health` on 8000), healthchecks, loopback-only ports, `.env.example` with ports only | `docker-compose.yml`, `README.md` "TrackFlow Development Stack" | implemented |
| Migration of both frontends from Vite to Next.js 16.4 / React 19.3 App Router, `/api/*` rewrites to the server-only API target | `README.md` "Next.js Migration and Evidence", `uis/*/README.md`, commit `feat(infra): migrate frontends from Vite to Next.js` | implemented |
| Devcontainer with Docker-in-Docker, bootstrap script with `uv --frozen` | README "Codespaces Bootstrap", commits | implemented |
| Verification table (build, up, healthchecks, HTTP 200 on five endpoints, HMR, supervised failure, SIGTERM exit 0, Playwright 0.0000 % pixel diff after migration) | `memory-bank/progress.md` | author-verified; **not re-run here** |
| Five evidence screenshots (build, compose, website, backoffice, FastAPI) | `docs/screenshots/infra-40-*.png`, `docs/README.md` | verified present |
| CI/CD, production deployment, business API | README: "development environment, not a production deployment"; progress: out of scope | not implemented |

## 5. Lab 04 — AI engineering workflow (practices actually used)

Evidence of practice, taken only from the two repositories above:

| Practice | Evidence |
|---|---|
| Session protocol: read `CONTEXT.md` → memory bank → rules before any change; authorisation limits; no invented facts; keep contradictions visible | `Back-office/AGENTS.md` |
| Repository-wide rule with explicit scope/activation (`always_active`) and per-rule evidence | `.agents/rules/trackflow-repository-structure.md` |
| Reusable review skill that emits PASS/FAIL before a commit and never commits | `.agents/skills/pre-commit-review/SKILL.md` |
| Memory bank kept as project state (brief, tech context, progress) and updated per milestone | `memory-bank/*` in both repositories |
| Verification trail with ❌ claim → ✅ correction and ❓ unverified markers | `ai-eng-…/verification.md`, `.agents/rules/validation.md` |
| Derived engineering findings → rule candidates → rules | `engineering-findings.md` → `.agents/rules/api-contracts.md`, `financial-domain.md` |
| Milestones delivered as feature branches + pull requests, no merge without authorisation | PR #1 and #2 in `Back-office`, `memory-bank/progress.md` |

Terms used by the brief that are **not** evidenced in the repositories: a formal "Spec → Plan → Tasks" document set. The campus therefore describes the workflow as *context → rules → skills → verify → memory*, which is what the files show. Status: in progress (a practice, not a finished artefact).

## 6. What the campus will and will not say

- Will say: programme and dates as evidenced, four labs with their real scope and status, repository links, stacks as found in the files, open findings as open.
- Will not say: course completion or certification, production deployments, business features of TrackFlow, metrics, that the Financial Dashboard app was written by Pau, or anything about TrackFlow's people (the briefing's named staff are fictional course material and are not reproduced).
- Logos: no 4Geeks logo or trademark artwork is used; the campus uses the name in text only.

## 7. Links registered

- https://github.com/paura432/Back-office
- https://github.com/paura432/ai-eng-financial-dashboard-context-project
- Upstream exercise (for attribution): https://github.com/4GeeksAcademy/ai-eng-financial-dashboard-context-project
- Programme page referenced by the template badge: https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia
