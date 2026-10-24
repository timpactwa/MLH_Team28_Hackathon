# TASKS.md: the single source of truth

Every piece of work maps to a task ID here. The decisions behind these tasks are D1–D10 in [INTERIOR_DESIGN_PLAN.md](INTERIOR_DESIGN_PLAN.md).

## Status values
`open` · `claimed by <person/agent> @ <time>` · `blocked: <reason>` · `review` · `done`

## Claim protocol (safe for parallel agents)
1. `git pull --rebase`
2. Edit **only** the `status:` line of the task you want to claim, then commit as `claim T-XXX` and push.
3. If the push is rejected, pull again and re-check. If someone else claimed it first, pick another task.
4. Work only in that task's `paths`. If you need something outside them, add a task or ask its owner.
5. Commit messages start with the task ID, e.g. `T-201: doorway clearance check`.
6. A claim older than 3 hours with no commits is stale and can be taken over. Note the takeover in the changelog.

## Rules
- **Contracts first.** Don't change `lib/schema/` without the T-001 owner agreeing.
- Run `npm run typecheck && npm test` before pushing. Don't push a failing build to `main`.
- Before setting `done`, re-read the task's "done when" list and check every box honestly.

## Checkpoints (D9)
- **Sat +1 hr:** T-001, T-002 and T-401 done
- **Sat 6 PM:** skeleton working end to end (T-101, T-201, T-301, T-302)
- **Sat midnight:** full loop deployed (T-103, T-303, T-402)
- **Sun 2 AM:** World Labs kill decision (T-404)
- **Sun 9 AM:** feature freeze
- **Sun 11:00–11:30 AM:** both submissions in (T-409)

Cut order (D10): T-404, then T-403, then T-102. **Never cut:** T-201, T-103, T-301, T-305.

---

## Lane 0: contracts (do these first)

### T-001 · Shared Zod schema
- status: open
- owner lane: P3
- paths: `lib/schema/`
- done when:
  - [ ] `Room` (width, depth, height in inches; walls; openings: door/window with wall, offset, width, door swing)
  - [ ] Each dimension carries `source: "estimated" | "confirmed"`
  - [ ] `CatalogItem` (id, name, w/d/h, model path, tags) and `Placement` (itemId, x, y, rotation in 0/90/180/270)
  - [ ] `Layout` (placements[], rationale) and `CheckResult` (ok, violations[] with code, items, message, overlap_in)
  - [ ] `Needs` (free text plus a structured list) and `ClearanceRequirement` (e.g. a 60 in turning circle)
  - [ ] Exported TS types, plus JSON Schema output for Gemma structured output

### T-002 · Repo scaffold
- status: open
- owner lane: Tim
- paths: `package.json`, `app/layout.tsx`, `tsconfig.json`, `LICENSE`, `.gitignore`, `.env.example`, `vitest.config.ts`
- done when:
  - [ ] Next.js (App Router) + TS + Tailwind + R3F + drei + zod + `@google/genai` + vitest installed
  - [ ] MIT `LICENSE` file at the root
  - [ ] `npm run dev`, `typecheck`, `test` all work
  - [ ] `.env.example` lists `GEMINI_API_KEY`, `WORLDLABS_API_KEY`; `.env*` is gitignored

---

## Lane 1: AI (P2)

### T-101 · Gemma client and the needs → furniture call
- status: open
- deps: T-001, T-002
- paths: `lib/ai/gemma.ts`, `lib/ai/prompts/needs.ts`, `app/api/needs/route.ts`
- done when:
  - [ ] Confirm the Gemma 4 model ID available to our key and record it in `.env.example`
  - [ ] Free text → catalog item IDs + clearance requirements; Zod-validated, so unknown items are rejected
  - [ ] Timeout and one retry; errors return a useful message

### T-102 · Photo → estimated room (cut #3)
- status: open
- deps: T-101
- paths: `lib/ai/prompts/photo.ts`, `app/api/photo/route.ts`
- done when:
  - [ ] An inline image (never the Files API, never written to disk or logged) returns door/window positions and proportions
  - [ ] Every value is marked `source: "estimated"`
  - [ ] Works on the demo photo (T-406)

### T-103 · Propose → check → revise loop (never cut)
- status: open
- deps: T-101, T-201
- paths: `lib/ai/planner.ts`, `lib/ai/prompts/layout.ts`, `app/api/plan/route.ts`
- done when:
  - [ ] Gemma proposes 2 layouts as JSON; every placement goes through `lib/geometry` checks
  - [ ] Violations go back to Gemma as specific errors; at most 2 revision rounds
  - [ ] A layout that still fails is returned as "doesn't fit" with the reasons, never shown as passing
  - [ ] Plain-language tradeoff explanation per layout; it may only cite numbers from the checker result
  - [ ] Token usage and latency are logged per request (feeds T-408)

---

## Lane 2: geometry + data (P3)

### T-201 · Geometry checks (never cut)
- status: open
- deps: T-001
- paths: `lib/geometry/`, `lib/geometry/*.test.ts`
- done when:
  - [ ] Checks: out of bounds, footprint overlap (rotated), blocks a door swing, inside doorway clearance, turning-circle space available
  - [ ] Pure functions, no I/O; they run both in the browser and on the server
  - [ ] Violations include an overlap distance in inches
  - [ ] Tests include the demo case: an oversized sofa over the door fails and the smaller sofa passes

### T-202 · Furniture catalog
- status: open
- deps: T-001
- paths: `data/catalog.json`, `public/models/`
- done when:
  - [ ] 12–20 items (bed sizes, desk, sofa S/L, dining table, chairs, dresser, shelf), each with real-world dimensions
  - [ ] CC0 low-poly models (e.g. the Kenney furniture kit) scaled to the catalog dimensions; licenses recorded in `public/models/LICENSES.md`

### T-203 · Demo room fixture
- status: open
- deps: T-001, T-406
- paths: `data/demo-room.json`
- done when:
  - [ ] The room for the demo photo, labeled "example dimensions, not measured"
  - [ ] Built so that the large sofa fails at the door and the small sofa fits

---

## Lane 3: frontend / UX (Tim)

### T-301 · Room editor + 2D plan
- status: open
- deps: T-001, T-201
- paths: `app/(app)/editor/`, `components/editor/`
- done when:
  - [ ] Set dimensions; place doors and windows; estimated values look visibly different until confirmed
  - [ ] 2D plan draws furniture, door swings and clearance zones
  - [ ] Dragging an item re-runs the checks live; an item in violation turns red with the reason
  - [ ] Fully keyboard-operable

### T-302 · 3D room walkthrough (core layer a, never cut)
- status: open
- deps: T-001, T-202
- paths: `components/viewer/`
- done when:
  - [ ] Room and furniture built from the confirmed geometry, at true scale
  - [ ] WASD + mouse look, plus click-to-move and on-screen buttons
  - [ ] Respects `prefers-reduced-motion`

### T-303 · Main flow UI
- status: open
- deps: T-301, T-302, T-103
- paths: `app/(app)/page.tsx`, `components/flow/`
- done when:
  - [ ] Photo or prepared example → confirm the room → needs + style → 2 layouts compared side by side → pick one → tour
  - [ ] A rejected layout shows the violation and the revision, clearly
  - [ ] Loading, error and "doesn't fit" states are designed

### T-304 · Compare views (layers b/c)
- status: open
- deps: T-302, T-403
- paths: `components/compare/`
- done when:
  - [ ] Original photo next to the staged concept; World Labs tab if T-404 survives
  - [ ] Labels: "AI concept, not to scale. The 3D plan is what we checked."

### T-305 · Accessible summary (never cut)
- status: open
- deps: T-303
- paths: `components/summary/`
- done when:
  - [ ] Non-3D text summary of the layout: items, positions, clearances, what's estimated vs confirmed, limits
  - [ ] Screen-reader and keyboard tested; contrast checked; printable

### T-306 · UI/UX polish pass
- status: open
- deps: T-303
- paths: `app/globals.css`, `components/ui/`
- done when:
  - [ ] Consistent visual design and focus states; Lighthouse accessibility ≥ 95

---

## Lane 4: visuals + ship (P4)

### T-401 · Cloud Run hello-world
- status: open
- deps: T-002
- paths: `Dockerfile`, `.dockerignore`, `docs/DEPLOY.md`
- done when:
  - [ ] Standalone Next.js build in a container; deployed to Cloud Run **by a human**
  - [ ] `GEMINI_API_KEY` held in Secret Manager
  - [ ] Confirm which APIs the $25 credits cover (Cloud Run; Gemini API billing) and record it in DEPLOY.md

### T-402 · Deploy the full app
- status: open
- deps: T-401, T-303
- paths: `docs/DEPLOY.md`
- done when:
  - [ ] Full flow works at the public URL; prepared example loads instantly

### T-403 · Gemini staged photo (layer b, cut #2)
- status: open
- deps: T-101
- paths: `lib/ai/staging.ts`, `app/api/stage/route.ts`
- done when:
  - [ ] Original photo + chosen style → furnished concept image; cost per image recorded
  - [ ] Result is cached per input so the demo never pays twice

### T-404 · World Labs experiment (layer c, cut #1)
- status: open
- deps: T-302 working end to end
- paths: `lib/worldlabs/`, `components/worldlabs/`, `public/worlds/`
- done when:
  - [ ] Draft and standard worlds generated from the staged photo; actual cost and latency recorded
  - [ ] Loads in the browser via Spark; checked for invented doors and distortion
  - [ ] **Kill decision by Sun 2 AM**, recorded in the changelog
  - [ ] Shown only as pre-generated and labeled

### T-405 · User interviews (stakeholder empathy)
- status: open
- paths: `docs/validation.md`
- done when:
  - [ ] 3–5 students or renters interviewed, ideally including someone with mobility needs or an accessibility services contact
  - [ ] Quotes recorded with consent, no names unless permitted
  - [ ] At least one product change based on the feedback, logged as a task

### T-406 · Demo photo
- status: open
- paths: `public/demo/`, `docs/DATA.md`
- done when:
  - [ ] Free-licensed empty-room photo from Unsplash or Pexels with a visible door and window
  - [ ] License and link recorded in `docs/DATA.md`

### T-407 · README + docs
- status: open
- deps: T-402
- paths: `README.md`, `docs/ARCHITECTURE.md`
- done when:
  - [ ] Setup, environment variables, architecture diagram, limitations, sample inputs, how to reproduce the demo
  - [ ] Responsible AI section: estimated vs confirmed, no certification claims, photo handling, generated-view labels

### T-408 · Cost and latency report
- status: open
- deps: T-103, T-403
- paths: `docs/COST.md`
- done when:
  - [ ] Measured cost per design (Gemma, staging, World Labs) and latency, with model IDs and inputs

### T-409 · Video + both submissions
- status: open
- deps: T-402, T-407
- paths: `demo/script.md`
- done when:
  - [ ] Two-minute video following the demo plan in INTERIOR_DESIGN_PLAN.md
  - [ ] MLH submission (Best UI/UX only) **and** the codingjam.dev Virginia Tech chapter entry, both done by 11:30 AM Sunday
  - [ ] A human clicks submit

---

## Changelog (append-only, one line each)
- 2026-10-24: TASKS.md regenerated for the interior design pivot after the grilling session (D1–D10 locked).
