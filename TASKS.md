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
- status: done (tim/claude)
- owner lane: P3
- paths: `lib/schema/`
- done when:
  - [x] `Room` (width, depth, height in inches; walls; openings: door/window with wall, offset, width, door swing)
  - [x] Each dimension carries `source: "estimated" | "confirmed"`
  - [x] `CatalogItem` (id, name, w/d/h, model path, tags) and `Placement` (itemId, x, y, rotation in 0/90/180/270)
  - [x] `Layout` (placements[], rationale) and `CheckResult` (ok, violations[] with code, items, message, overlap_in)
  - [x] `Needs` (free text plus a structured list) and `ClearanceRequirement` (e.g. a 60 in turning circle)
  - [x] Exported TS types, plus JSON Schema output for Gemma structured output

- notes: import from `@/lib/schema`. All lengths in inches; origin is the NW corner, x east, y south; placements are footprint centers. `toJsonSchema(schema)` produces the JSON Schema for model output (rotation is an enum of 0/90/180/270).

### T-002 · Repo scaffold
- status: done (tim/claude)
- owner lane: Tim
- paths: `package.json`, `package-lock.json`, `app/layout.tsx`, `app/favicon.ico`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `LICENSE`, `.gitignore`, `.env.example`, `vitest.config.ts`, `lib/scaffold.test.ts`; initial `app/globals.css` (now T-306) and placeholder `app/(app)/page.tsx` (now T-303)
- done when:
  - [x] Next.js 16.4 (App Router) + TS + Tailwind 4 + R3F 9 + drei 10 + three + zod 4 + `@google/genai` + vitest 5 installed
  - [x] MIT `LICENSE` file at the root
  - [x] `npm run dev`, `typecheck`, `test` (and `lint`, `build`) all work
  - [x] `.env.example` lists `GEMINI_API_KEY`, `GEMMA_MODEL`, `WORLDLABS_API_KEY`; `.env*` is gitignored except `.env.example`
- notes: `next.config.ts` sets `output: "standalone"` for the Cloud Run container (T-401). Next 16 re-adds its agent-rules block to AGENTS.md on `next dev`, so it is committed there. The page title is "Room Fit (working title)" until a product name is chosen.

---

## Lane 1: AI (P2)

### T-101 · Gemma client and the needs → furniture call
- status: review: code and stub tests done; needs a live run with GEMINI_API_KEY (tim/claude)
- deps: T-001, T-002
- paths: `lib/ai/gemma.ts`, `lib/ai/model.ts`, `lib/ai/http.ts`, `lib/ai/needs.ts`, `lib/ai/prompts/needs.ts`, `app/api/needs/route.ts`
- done when:
  - [ ] Confirm the Gemma 4 model ID available to our key and record it in `.env.example`
  - [x] Free text → catalog item IDs + clearance requirements; Zod-validated, so unknown items are rejected
  - [x] Timeout and one retry; errors return a useful message

### T-102 · Photo → estimated room (cut #3)
- status: review: code, stub tests and UI done; needs a live run with GEMINI_API_KEY on the T-406 photo (tim/claude)
- deps: T-101
- paths: `lib/ai/prompts/photo.ts`, `lib/ai/photo.ts`, `app/api/photo/route.ts`, `components/flow/photo.ts`, photo card in `components/flow/StartStep.tsx`
- done when:
  - [x] An inline image (never the Files API, never written to disk or logged) returns door/window positions and proportions
  - [x] Every value is marked `source: "estimated"`
  - [ ] Works on the demo photo (T-406)

- notes: `POST /api/photo { photo: { mimeType, data } }` returns `{ room, notes, usage }`. The browser downscales to 1280 px JPEG first, which also strips EXIF/GPS. The model names walls from the camera's view (facing = north). `replyToRoom` clamps sizes to plausible ranges and keeps openings inside their walls. Fixed in the shared schema along the way: an opening's offset may now be 0 (a door at the corner), which the editor already allowed but `/api/plan` rejected. Prompt quality is untested until there is a key.

### T-103 · Propose → check → revise loop (never cut)
- status: review: code and stub tests done; needs a live run with GEMINI_API_KEY (tim/claude)
- deps: T-101, T-201
- paths: `lib/ai/planner.ts`, `lib/ai/prompts/layout.ts`, `app/api/plan/route.ts`
- done when:
  - [x] Gemma proposes 2 layouts as JSON; every placement goes through `lib/geometry` checks
  - [x] Violations go back to Gemma as specific errors; at most 2 revision rounds
  - [x] A layout that still fails is returned as "doesn't fit" with the reasons, never shown as passing
  - [x] Plain-language tradeoff explanation per layout; it may only cite numbers from the checker result
  - [x] Token usage and latency are logged per request (feeds T-408)

- notes: `createGemmaCall()` sends the system prompt as the first user part, because Gemma may not take a system instruction. Images go inline. It logs only label, model, latency and tokens. `generateJson` validates with Zod and retries once with the error. To finish: put the key in `.env.local`, run `curl -X POST localhost:3000/api/needs -d '{"text":"..."}'`, and confirm the model ID.

- notes: `planLayouts(call, { room, needs, catalog })` returns options with `status`, `attempts[]` (every round with its check result, for the rejection-then-fix UI), `explanation` and `explanationSource`. If the explanation contains any number not found in room, item or checker facts, or the words "certified" or "compliant", the template explanation is used instead. `POST /api/plan { room, needs }`. Live prompt quality is untested until there is a key.

---

## Lane 2: geometry + data (P3)

### T-201 · Geometry checks (never cut)
- status: done (tim/claude)
- deps: T-001
- paths: `lib/geometry/`, `lib/geometry/*.test.ts`
- done when:
  - [x] Checks: out of bounds, footprint overlap (rotated), blocks a door swing, inside doorway clearance, turning-circle space available
  - [x] Pure functions, no I/O; they run both in the browser and on the server
  - [x] Violations include an overlap distance in inches
  - [x] Tests include the demo case: an oversized sofa over the door fails and the smaller sofa passes

- notes: `checkLayout({ room, placements, catalog, clearances })` from `@/lib/geometry`. Door swing is an exact quarter disc from the hinge. The turning circle returns where it fits (`turningCircle`) for drawing. It does not check that the circle is reachable from the door.

### T-202 · Furniture catalog
- status: review: catalog done; CC0 models still to do (tim/claude)
- deps: T-001
- paths: `data/catalog.json`, `data/catalog.ts`, `public/models/`
- done when:
  - [x] 12–20 items (bed sizes, desk, sofa S/L, dining table, chairs, dresser, shelf), each with real-world dimensions
  - [ ] CC0 low-poly models (e.g. the Kenney furniture kit) scaled to the catalog dimensions; licenses recorded in `public/models/LICENSES.md`

- notes: 20 items, typical retail sizes (beds include about 2 in of frame). `model` is null for now, so the viewer draws boxes. The remaining work is the CC0 models.

### T-203 · Demo room fixture
- status: done (tim/claude)
- deps: T-001, T-406
- paths: `data/demo-room.json`, `data/demo-layout.json`, `data/demo.ts`, `data/demo.test.ts`
- done when:
  - [x] The room for the demo photo, labeled "example dimensions, not measured"
  - [x] Built so that the large sofa fails at the door and the small sofa fits

- notes: a 12 x 14 ft studio, south door, north and east windows, all marked estimated. P4: pick a T-406 photo that roughly matches (studio, door and window visible), or edit the JSON to match the photo and keep `data/demo.test.ts` passing.

---

## Lane 3: frontend / UX (Tim)

### T-301 · Room editor + 2D plan
- status: done (tim/claude)
- deps: T-001, T-201
- paths: `app/(app)/editor/`, `components/editor/`, `lib/geometry/nearest.ts`
- done when:
  - [x] Set dimensions; place doors and windows; estimated values look visibly different until confirmed
  - [x] 2D plan draws furniture, door swings and clearance zones
  - [x] Dragging an item re-runs the checks live; an item in violation turns red with the reason
  - [x] Fully keyboard-operable

- notes: running at `/editor`. "Try smaller" swaps the item, then slides it to the nearest spot within 36 in where it passes (`nearestFit`). Verified with Playwright: live checks, keyboard nudge and rotate, drag, confirm, turning circle.

### T-302 · 3D room walkthrough (core layer a, never cut)
- status: done (tim/claude)
- deps: T-001, T-202
- paths: `components/viewer/`
- done when:
  - [x] Room and furniture built from the confirmed geometry, at true scale
  - [x] WASD + mouse look, plus click-to-move and on-screen buttons
  - [x] Respects `prefers-reduced-motion`

- notes: `components/viewer/RoomViewer.tsx` (load it with `next/dynamic`, `ssr: false`) and `walker.ts`. Furniture renders as boxes until the T-202 models land. Violating items are red. Polish for T-306: a cutaway of the near wall in overview.

### T-303 · Main flow UI
- status: review: done except the photo path, which waits on T-102 (tim/claude)
- deps: T-301, T-302, T-103
- paths: `app/(app)/page.tsx`, `components/flow/`, read-only mode in `components/editor/PlanView.tsx`
- done when:
  - [ ] Photo or prepared example → confirm the room → needs + style → 2 layouts compared side by side → pick one → tour (everything works except the photo start, which waits on T-102)
  - [x] A rejected layout shows the violation and the revision, clearly
  - [x] Loading, error and "doesn't fit" states are designed

- notes: `/` runs the flow. Steps: pick the example studio or your own room, confirm the measurements (continuing marks them confirmed), needs (Gemma reads free text into an editable list; you can also build the list by hand), two options side by side, each with a "How it got here" list of every checker round, then the editor, 3D view and text summary. Without a key, `/api/*` returns 503 and the UI offers the non-AI paths: the prepared reading of the example needs, the prepared example plan (hand-written layouts, checked live, labeled as such; only for the example room and furniture, see `exampleApplies`), and "Arrange it myself" (`autoPlace`). T-102: add a photo card to `StartStep.tsx` that produces an estimated `Room` and goes to the room step. Verified with Playwright plus axe (clean at 1440 and 390 wide).

### T-304 · Compare views (layers b/c)
- status: open
- deps: T-302, T-403
- paths: `components/compare/`
- done when:
  - [ ] Original photo next to the staged concept; World Labs tab if T-404 survives
  - [ ] Labels: "AI concept, not to scale. The 3D plan is what we checked."

### T-305 · Accessible summary (never cut)
- status: review: built and checked with axe; needs a real screen-reader pass (NVDA or VoiceOver) by a human (tim/claude)
- deps: T-303
- paths: `components/summary/`
- done when:
  - [x] Non-3D text summary of the layout: items, positions, clearances, what's estimated vs confirmed, limits
  - [ ] Screen-reader and keyboard tested; contrast checked; printable

- notes: `LayoutSummary` sits under the editor (a skip link jumps to it) and updates live. It lists the room with estimated or confirmed per value, each opening, each item's size, position and orientation, the requested clear space, problems, and limits. "Print summary" prints only the summary. Phrases are in `describe.ts`, with tests. Still to do: an NVDA/VoiceOver pass by a person.

### T-306 · UI/UX polish pass
- status: review: first pass done; the team should look it over (tim/claude)
- deps: T-303
- paths: `app/globals.css`, `components/ui/`
- done when:
  - [x] Consistent visual design and focus states; Lighthouse accessibility ≥ 95

- notes: light-only theme (the old dark-mode block put light text on light panels), Geist everywhere, one amber focus ring in `globals.css`. Plan labels drop the bracketed part of the name, wrap to two lines, or turn to run along tall boxes (`fitLabel`, tested). 3D overview: walls between the camera and the room drop to a 10 in stub. Lighthouse on the production build: accessibility 100 and best practices 100 on `/` and `/editor`, performance 90 to 93. axe is clean on every flow step at 1440 and 390 wide. `/editor` links back to the guided flow.

---

## Lane 4: visuals + ship (P4)

### T-401 · Cloud Run hello-world
- status: review: Dockerfile and DEPLOY.md written; needs a human to build the image, create the secret, deploy, and confirm credits (tim/claude)
- deps: T-002
- paths: `Dockerfile`, `.dockerignore`, `docs/DEPLOY.md`
- done when:
  - [ ] Standalone Next.js build in a container; deployed to Cloud Run **by a human**
  - [ ] `GEMINI_API_KEY` held in Secret Manager
  - [ ] Confirm which APIs the $25 credits cover (Cloud Run; Gemini API billing) and record it in DEPLOY.md

- notes: the standalone server was checked locally (pages, static assets, 503 without a key). The Docker image itself is untested here because Docker Desktop was not running. `docs/DEPLOY.md` has the exact gcloud commands (Secret Manager, `gcloud run deploy --source .`, timeout 300, max 3 instances) and the open billing questions.

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
- status: claimed by tim/claude @ 2026-10-24 17:20 (first draft; P4 finishes it after the deploy)
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
- 2026-10-24: T-002 done. Scaffold builds; `npm run typecheck && npm test` pass.
- 2026-10-24: T-001 and T-201 done (16 tests). T-202 catalog data done; models still to do.
- 2026-10-24: T-203, T-301, T-302 done. `/editor` has the live-checked 2D plan and the 3D overview and walk-through (20 tests).
- 2026-10-24: T-101 and T-103 code done, 25 tests passing with a scripted model stub. Both wait on GEMINI_API_KEY for a live run.
