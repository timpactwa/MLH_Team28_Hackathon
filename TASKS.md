# Waypoint: TASKS.md (single source of truth)

**This file is the source of truth for what's being worked on.** Humans and AI agents both work from it.
The *why* lives in [BRAINSTORM.md](BRAINSTORM.md); the *how-to-work* rules live in [AGENTS.md](AGENTS.md).
If you're about to do something that isn't a task here, add a task first.

Deadline: **Sun Oct 25, 12:30 PM, submit at 11:00 AM.** Feature freeze: **Sun 9:00 AM.**

---

## How to use this file

### Status values
- `open`: nobody has it
- `claimed by <who> @ <time>`: someone is on it. `<who>` = person, or `person/agent` (e.g. `tim/claude-1`)
- `blocked: <reason>`
- `review`: done, waiting for someone to check it
- `done`: merged to `main` and meets "Done when"

### Claim protocol (git is the lock)
1. `git pull --rebase`
2. Pick an `open` task whose `deps` are all `done` (or marked *contract-ready*, see below).
3. Edit **only that task's `status:` line** to `claimed by <who> @ <HH:MM>`.
4. `git commit -m "claim T-XXX" TASKS.md && git push`
5. If the push is rejected: `git pull --rebase`. If someone else claimed it, pick another task. Otherwise push again.
6. Work **only in the task's `paths`**. If you need to touch another task's paths, add a new task or ask its owner.
7. When finished: set `status: review` (or `done` if trivial), check its boxes, commit with the code, push.

### Rules
- **Edit only your own task's block**, plus adding new tasks at the bottom of a lane. That keeps merge conflicts tiny.
- New task IDs: use the next free number in that lane (lanes are numbered by hundreds).
- **Contracts first.** T-001 to T-004 define the shapes everyone codes against. Once a contract task is `done`, change it only through a new task, and post in the team chat.
- Stale claim: if a claim is more than 3 hours old with no commits, ping the owner, then you may reclaim it.
- Never mark a task `done` if its tests fail.

---

## Checkpoints (from BRAINSTORM §10)

- [ ] **Sat 3 PM:** contracts (T-001 to T-004), repo + LICENSE, Cloud Run hello world (T-402)
- [ ] **Sat 7 PM:** ugly end-to-end on a hardcoded profile with 5 real records
- [ ] **Sat 11 PM:** Gemma intake + grounding + all records + crisis layer
- [ ] **Sun 2 AM:** voice, print, phone view, accessibility pass
- [ ] **Sun 9 AM:** FEATURE FREEZE
- [ ] **Sun 10:15 AM:** video recorded
- [ ] **Sun 11:00 AM:** both submissions in

**Cut order if a checkpoint slips by more than 2 h:** T-306 (phone view), then T-305 (voice), then T-205 (meals/showers). **Never cut:** T-103, T-104, T-106.

---

## Lane 0: Contracts & skeleton (everyone waits on these, so do them first)

### T-001 · Pydantic models: Record, Profile, Plan
- status: open
- owner lane: P2 + P3 (pair)
- deps: none
- paths: `backend/app/models.py`
- done when:
  - [ ] `Record` matches the BRAINSTORM §8 schema (`pets_allowed: bool | None`, `hours: list[Hours]`, `source_url`, `retrieved_at`)
  - [ ] `Profile`: `populations`, `borough`, `has_pet`, `arrival_time`, `needs` (shelter/shower/meal/id), `documents_held: list[ExtractedDoc]`, `safety_flag: bool`
  - [ ] `ExtractedDoc`: `doc_type, name, dob, expiry, issuing_state` only (no ID number, no address)
  - [ ] `Plan`: `shortlist: list[record_id]`, `id_checklist: list[ChecklistItem]`, `stops: list[Stop]`, each item carrying `record_id` / `source_url`
  - [ ] Merged, and the team is told "contracts ready"

### T-002 · API contract (routes + request/response models)
- status: open
- owner lane: Tim
- deps: T-001
- paths: `backend/app/main.py` (route stubs returning fixtures)
- done when:
  - [ ] `POST /api/intake` (text + optional base64 image) returns `Profile` or `CrisisResponse`
  - [ ] `POST /api/plan` (Profile) returns `PlanResponse` (`plan`, `prose`, `prose_source: "model" | "template"`)
  - [ ] `GET /api/health`
  - [ ] Stubs return a fixture so the frontend can build against them

### T-003 · Repo skeleton, LICENSE, tooling
- status: open
- owner lane: P4
- deps: none
- paths: `LICENSE`, `.gitignore`, `backend/pyproject.toml`, `backend/app/__init__.py`, `frontend/` scaffold, `Dockerfile`
- done when:
  - [ ] MIT or Apache-2.0 LICENSE at root
  - [ ] `cd backend && pytest` runs (even with 0 tests)
  - [ ] Next.js app in `frontend/` with `output: 'export'`
  - [ ] Dockerfile: builds the frontend export, then FastAPI serves `/api/*` and the static files

### T-004 · Placeholder grammar
- status: open
- owner lane: Tim
- deps: T-001
- paths: `backend/app/grounding.py` (docstring + regex constant only), `docs/placeholders.md`
- done when:
  - [ ] The syntax `{{<record_id>.<field>}}` and `{{id.missing[n]}}` is documented with the allowed fields
  - [ ] Rule written down: a missing field renders "Not in our data — call 311 to confirm"

---

## Lane 1: Gemma pipeline & safety (Tim)

### T-101 · Gemma client wrapper
- status: open
- deps: T-003
- paths: `backend/app/gemma.py`
- done when:
  - [ ] Uses the `google-genai` SDK, model from env `GEMMA_MODEL` (default `gemma-4-26b-a4b-it`), key from `GEMINI_API_KEY`
  - [ ] Images sent **inline**, never through the Files API
  - [ ] Request bodies are never logged

### T-102 · Intake: input → Profile
- status: open
- deps: T-001, T-101
- paths: `backend/app/intake.py`, `backend/app/prompts/intake.txt`, `backend/tests/test_intake.py`
- done when:
  - [ ] Prompt asks for JSON matching `Profile`; validated with Pydantic; one retry; otherwise returns "please rephrase"
  - [ ] Extracts from the ID photo only the `ExtractedDoc` fields
  - [ ] Sets `safety_flag` for indirect crisis wording
  - [ ] Test with mocked model output: valid, malformed then retry, and garbage

### T-103 · Crisis rules check (layer 1) ⚠ never cut
- status: open
- deps: T-001
- paths: `backend/app/crisis.py`, `backend/tests/test_crisis.py`
- done when:
  - [ ] Keyword/regex list: self-harm, overdose, assault/danger, child in danger, medical emergency
  - [ ] Runs **before** any Gemma call in `/api/intake`
  - [ ] Returns `CrisisResponse` (911 / 988 / 311 text from T-404)
  - [ ] Tests: positives, negatives, and no false positive on "I need a shower"

### T-104 · Grounding: fill placeholders + post-check ⚠ never cut
- status: open
- deps: T-004, T-201
- paths: `backend/app/grounding.py`, `backend/tests/test_grounding.py`
- done when:
  - [ ] Fills placeholders from records and attaches source footnotes
  - [ ] Post-check: any phone, address or time pattern **not** produced by a placeholder means the prose is discarded and the template is used
  - [ ] Tests include a "hallucinated phone number" case that must fall back

### T-105 · Explain: Plan → placeholder prose
- status: open
- deps: T-101, T-104, T-301
- paths: `backend/app/explain.py`, `backend/app/prompts/explain.txt`
- done when:
  - [ ] Model receives the plan JSON with record IDs only (no raw addresses or phones)
  - [ ] Output goes through T-104; `prose_source` is set correctly

### T-106 · Template plan renderer (fallback) ⚠ never cut
- status: open
- deps: T-001
- paths: `backend/app/template.py`, `backend/tests/test_template.py`
- done when:
  - [ ] Renders a complete plain-language plan from `Plan` + records with no model call
  - [ ] Used whenever the model fails or the post-check rejects

### T-107 · Wire real routes
- status: open
- deps: T-102, T-103, T-105, T-106, T-301
- paths: `backend/app/main.py`
- done when:
  - [ ] `/api/intake` and `/api/plan` call the real pipeline; stubs removed
  - [ ] Safety flag from either layer returns the crisis response

---

## Lane 2: Data (P2)

All records: `source_url` + `retrieved_at` required. Never write "verified." `null` = unknown.

### T-201 · Drop-in centers
- status: open
- deps: T-001
- paths: `data/nyc/dropins.json`
- done when:
  - [ ] Every record from the NYC Open Data Directory of Homeless Drop-In Centers, geocoded (lat/lon)
  - [ ] Hours and populations filled where the source says; otherwise `null`
  - [ ] Passes T-206 validation

### T-202 · Intake centers
- status: open
- deps: T-001
- paths: `data/nyc/intake.json`
- done when:
  - [ ] 30th Street (single men), HELP Women's/Franklin (single women), PATH (families w/ children), AFIC (adult families), each with an official source

### T-203 · IDNYC Bronx enrollment sites
- status: open
- deps: T-001
- paths: `data/nyc/idnyc_sites.json`
- done when:
  - [ ] 3–4 Bronx sites with hours and a source

### T-204 · IDNYC rules file
- status: open
- deps: T-001
- paths: `data/nyc/idnyc_rules.json`, `backend/app/models.py` (add a `IdRules` model *via a note to T-001's owner*)
- done when:
  - [ ] Identity docs, residency docs, points system (only if still current), shelter-letter rule (15+ days, dated within 60 days, per the form), first card free, hardship fee waiver
  - [ ] Each rule has its own `source_url` + `retrieved_at`, taken from a **current** nyc.gov page (the forms we found are 2016–2018)

### T-205 · Meals / showers (if time allows)
- status: open
- deps: T-001
- paths: `data/nyc/services.json`
- done when:
  - [ ] 3–5 Bronx records with sources

### T-206 · Data validation script
- status: open
- deps: T-001
- paths: `backend/scripts/validate_data.py`, `backend/tests/test_data.py`
- done when:
  - [ ] Loads every `data/nyc/*.json` file into `Record` / `IdRules`; fails on a missing source or date
  - [ ] Runs in pytest

---

## Lane 3: Engine (P3)

Pure Python, no AI, everything unit-tested.

### T-301 · Shortlist ranking
- status: open
- deps: T-001, T-201 (5 records are enough to start)
- paths: `backend/app/engine/ranking.py`, `backend/tests/test_ranking.py`
- done when:
  - [ ] Filters by population and open at `arrival_time`, sorts by distance, returns the top N
  - [ ] `pets_allowed: null` is treated as unknown, not true
  - [ ] Tests for a closed-at-arrival case and a wrong-population case

### T-302 · IDNYC checklist
- status: open
- deps: T-001, T-204
- paths: `backend/app/engine/idnyc.py`, `backend/tests/test_idnyc.py`
- done when:
  - [ ] Given `documents_held`, returns only the missing items, each with a `source_url`
  - [ ] An expired ID is handled according to what the rules file says (no guessing)
  - [ ] Persona test: expired state ID, staying at a drop-in → expected checklist

### T-303 · Day plan ordering + Maps links
- status: open
- deps: T-301, T-302, T-203
- paths: `backend/app/engine/itinerary.py`, `backend/tests/test_itinerary.py`
- done when:
  - [ ] Orders stops by opening hours (e.g. IDNYC during business hours, overnight last)
  - [ ] Each leg has a Google Maps transit directions URL (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...&travelmode=transit`)

### T-304 · `build_plan(profile) -> Plan`
- status: open
- deps: T-301, T-302, T-303
- paths: `backend/app/engine/__init__.py`, `backend/tests/test_persona.py`
- done when:
  - [ ] End-to-end persona test passes with no model call

---

## Lane 3b: Frontend (Tim, part-time; anyone can claim)

### T-305 · Voice input (Web Speech API) (if time allows)
- status: open
- deps: T-307
- paths: `frontend/components/VoiceInput.tsx`
- done when:
  - [ ] Mic button → transcript into the text box; graceful fallback when the browser doesn't support it

### T-306 · Phone-view mock (if time allows)
- status: open
- deps: T-308
- paths: `frontend/components/PhoneView.tsx`
- done when:
  - [ ] The same plan text shown in an SMS-style phone frame

### T-307 · Intake screen
- status: open
- deps: T-002, T-003
- paths: `frontend/app/page.tsx`, `frontend/components/Intake*.tsx`, `frontend/lib/api.ts`
- done when:
  - [ ] Text box + photo upload (downscaled to ~1024px JPEG in the browser, sent as base64)
  - [ ] Notice: "Your photo is read once and never saved."
  - [ ] Profile kept in memory only (no localStorage)

### T-308 · Plan screen + sources
- status: open
- deps: T-002
- paths: `frontend/app/plan/`, `frontend/components/Plan*.tsx`
- done when:
  - [ ] Shortlist, checklist and stops, each with "Sourced from X, retrieved DATE — call to confirm"
  - [ ] Toggle: model prose vs. the plan with sources expanded

### T-309 · Crisis card
- status: open
- deps: T-002, T-404
- paths: `frontend/components/CrisisCard.tsx`
- done when:
  - [ ] Shows 911 / 988 / 311 on top of the plan, with "I'm safe, continue to my plan"

### T-310 · Print view
- status: open
- deps: T-308
- paths: `frontend/app/plan/print.css`, `frontend/components/PrintPlan.tsx`
- done when:
  - [ ] Fits one page, large type, no navigation, sources listed

### T-311 · Accessibility pass
- status: open
- deps: T-307, T-308, T-309
- paths: frontend (fixes only)
- done when:
  - [ ] Keyboard-only run-through of the full flow works
  - [ ] Contrast at least 4.5:1, labels on every input, live region for results
  - [ ] Lighthouse accessibility ≥ 95 (screenshot for the video/README)

### T-312 · Generate TS types from OpenAPI
- status: open
- deps: T-002
- paths: `frontend/lib/api-types.ts`, `frontend/package.json` script
- done when:
  - [ ] `npm run gen:types` uses `openapi-typescript` against FastAPI's `/openapi.json`

---

## Lane 4: Ops, docs, validation, submission (P4)

### T-401 · Verify open checks (BRAINSTORM §13)
- status: open
- deps: none
- paths: `BRAINSTORM.md` §13 (tick the boxes and note findings)
- done when:
  - [ ] Credits cover the Gemini API? Billing enabled on the key's project
  - [ ] Current paid- vs. free-tier data-use terms
  - [ ] Gemma model IDs visible to our key
  - [ ] "Waypoint" name-conflict search

### T-402 · Cloud Run hello world → real deploy
- status: open
- deps: T-003
- paths: `Dockerfile`, `docs/DEPLOY.md`
- done when:
  - [ ] Hello world live by Sat 3 PM; URL posted here: `________`
  - [ ] `GEMINI_API_KEY` stored as a secret, not in the repo
  - [ ] Redeployed with the real app after T-107

### T-403 · Outreach emails
- status: open
- deps: none
- paths: `docs/validation.md` (log: org, date sent, reply, permission to quote)
- done when:
  - [ ] 5–8 personalized emails reviewed by a human and sent from a teammate's address
  - [ ] Replies and quote permissions logged

### T-404 · Crisis copy + sources
- status: open
- deps: none
- paths: `data/nyc/crisis.json`
- done when:
  - [ ] 911 / 988 / 311 outreach wording taken from official pages, with `source_url` + `retrieved_at`

### T-405 · Personas + problem stat
- status: open
- deps: none
- paths: `docs/personas.md`
- done when:
  - [ ] Two personas grounded in cited sources (*State of the Homeless*, DHS)
  - [ ] One cited NYC stat for the video opener

### T-406 · README + setup + data-update guide
- status: open
- deps: T-402
- paths: `README.md`, `docs/DATA.md`
- done when:
  - [ ] What it is, architecture diagram, local run, deploy in one command, env vars
  - [ ] How a nonprofit swaps in its own `data/` folder (Roanoke example)
  - [ ] Cost per plan estimate; self-hosted Gemma path
  - [ ] Privacy and safety sections

### T-407 · Sample/fake ID image for the demo
- status: open
- deps: none
- paths: `demo/sample_id.jpg`, `demo/script.md`
- done when:
  - [ ] Obviously fake ID ("SAMPLE" watermark), no real person's details

### T-408 · Video
- status: open
- deps: T-107, T-310 (feature freeze)
- paths: `demo/script.md`
- done when:
  - [ ] Follows BRAINSTORM §11, max 2:00, backup take, uploaded with a link pasted here: `________`

### T-409 · Submit to OrganizerHQ (MLH: Gemma 4 only)
- status: open
- deps: T-408, T-406
- done when:
  - [ ] Submitted at 11:00 AM with the repo link, LICENSE, description, tech used and video

### T-410 · Submit to codingjam.dev (VT chapter entry)
- status: open
- deps: T-408, T-406
- done when:
  - [ ] Submitted to the **Virginia Tech chapter** entry with the codebase, video and description

---

### T-411 · Documentation audit and project summary
- status: review (newton/docs-audit-agent; audit complete locally; claim push blocked by GitHub 403)
- deps: none
- paths: `TASKS.md` (this task only); read-only review of repository documentation and linked public sources
- done when:
  - [x] Compare documented implementation claims with tracked repository files
  - [x] Cross-check key external technical and NYC service claims against official sources
  - [x] Report current project state, inconsistencies, and remaining uncertainties to the user

---

## Changelog (append-only, one line each)

- Sat Oct 24: TASKS.md created from BRAINSTORM.md.
