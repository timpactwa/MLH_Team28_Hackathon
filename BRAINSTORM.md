# Waypoint — Team Brainstorm & Plan

> GDG Build with AI x Hacktoberfest 2026 · Virginia Tech · Oct 24–25, 2026
> Theme: **AI for Housing** · Team 28

> **Working on this?** [TASKS.md](TASKS.md) is the single source of truth for work; [AGENTS.md](AGENTS.md) has the rules. This file holds the decisions and the reasoning behind them.

**One line:** One conversation becomes one plan you can print — where to go tonight, what ID you're missing, and the order to do it in.

---

## 1. Hard facts from the event deck (don't forget these)

- **Submission window: Sun 11:00 AM – 12:30 PM. Late = not accepted.**
- **Two separate submissions — both required:**
  1. **MLH (OrganizerHQ):** public GitHub repo + open-source LICENSE file, name, description, tech used, GitHub link, **2-minute video**. **Select only ONE MLH track.**
  2. **GDG Housing (codingjam.dev):** submit to the **Virginia Tech chapter entry**, not the umbrella page. Codebase, demo video, short description.
- One demo session, scored for every track entered.
- All code must be public. Built during the weekend.
- $25 Google Cloud credits per team.

## 2. Tracks we're entering

| Track | Why we fit |
|---|---|
| **MLH: Best Use of Gemma 4** (our one MLH pick) | Gemma 4 is core: it turns messy speech/text/photos into a structured profile, and turns the plan into plain language. Open weights → a nonprofit can self-host. |
| **GDG: Best Overall AI for Housing** | Homelessness & community resources is a listed challenge area. |

We still host on Cloud Run and ship an open-source license, but we do **not** enter the Cloud or Open-Source tracks (only one MLH track allowed).

## 3. Rubric (100 pts) and how we score each line

| Pillar | Line | Pts | Our answer |
|---|---|---|---|
| Problem & Impact | Problem definition | 10 | NYC's real path: drop-in → intake center → IDNYC. Most people don't know shelter = go to intake, not shop around. |
| | Impact multiplier | 10 | Fewer wasted trips, ID recovered faster → job/benefits. Print-out works with no phone. |
| | Stakeholder empathy | 5 | Caseworker quote (outreach) or sourced personas. |
| Tech & AI | AI integration & necessity | 15 | Multimodal intake (photo of ID, voice→text), structured extraction, plain-language explanation. AI only where needed. |
| | Architectural soundness | 10 | Deterministic tested engine, Pydantic-validated model output, template fallback. |
| Responsible AI | Safety & grounding | 10 | Crisis guardrail before the model; placeholder grounding + post-check; "not in our data" rule. |
| | Privacy & data ethics | 8 | ID photo inline, in memory, never stored; minimal fields; no server-side profiles; paid-tier API terms. |
| | Inclusive design | 7 | WCAG: keyboard nav, contrast, screen reader, voice input, large print. |
| Feasibility | Deployment viability | 10 | One container, one API key, `gcloud run deploy`. |
| | Inference cost | 8 | Gemma 4 26B A4B (MoE, ~4B active), 2 calls per plan, cents per plan. Self-host path. |
| | Docs | 7 | README + setup guide + data-update guide. |

## 4. The product

**One profile → one plan → many outputs.**

1. **Intake** (voice, text, or photo) → structured **case profile**
2. **Engine** → shelter/drop-in shortlist + IDNYC checklist (only what's missing) + ordered day plan
3. **Output** → web view, phone-view mock (SMS-style), printable one-pager

### In scope
- Text + photo intake (Gemma 4 vision reads an expired ID / benefit letter)
- Voice intake via the browser **Web Speech API** → text → Gemma (the Gemma 4 models on the API don't take audio)
- Drop-in / intake shortlist
- IDNYC checklist showing only missing items
- Day plan ordered by opening hours, each leg a **Google Maps transit directions link**
- Printable one-page plan

### Cut (on purpose)
- GTFS trip scheduler (too much work for 10 seconds of demo)
- Real SMS (phone-view mock instead, if time allows)
- Real-time bed availability (we don't have it, and we never imply we do)

## 5. Demo persona

**Single adult in the Bronx, wallet stolen, staying at a drop-in center.** Has a phone photo of an **expired state ID**.

> "I lost my wallet, I need somewhere to shower and sleep tonight, and I need ID to start a job Monday."

Flow: speaks → uploads (sample/fake) ID → Gemma extracts name/DOB/expiry → image discarded → plan: 2 drop-ins with hours + sources, IDNYC checklist (identity: expired ID may count, *cited*; residency: request shelter letter, *cited*), ordered day plan with Maps links → **print**.

Pets/family are profile fields and filters but not the main story (hard to source; families go only to PATH). Optional 5-second "with a dog" rerun if we find a sourced record.

## 6. Architecture

```
 Browser (static Next.js export)
   │  voice ──Web Speech API──► text
   │  photo ──downscale ~1024px JPEG──┐
   ▼                                  ▼
 FastAPI  /api/*  (one Cloud Run container, also serves the static site)
   │
   ├─ 1. Crisis rules check (regex/keywords) ──match──► crisis card, STOP before model
   │
   ├─ 2. Gemma 4 call #1: input → profile JSON  (image inline, never stored)
   │        └─ Pydantic validate → retry once → else ask user to rephrase
   │        └─ safety_flag == true ──► crisis card
   │
   ├─ 3. Deterministic engine (pure Python, pytest)
   │        filter (population, open at arrival) → sort by distance
   │        IDNYC rules → missing-docs checklist
   │        order stops by hours → Google Maps links
   │
   ├─ 4. Gemma 4 call #2: plan JSON → plain-language prose WITH PLACEHOLDERS
   │        e.g. "Go to {{bx_dropin_02.name}}, opens {{bx_dropin_02.hours_today}}"
   │
   └─ 5. Python fills placeholders from records + source footnotes
            post-check: any phone/address/time not from a placeholder ──► discard prose, show template plan
            missing field ──► "Not in our data — call 311 to confirm"
```

**The rule:** *The model writes the words; our data supplies every fact.*

### Stack
- **Backend:** Python, FastAPI, Pydantic, pytest, `google-genai` SDK
- **Model:** `gemma-4-26b-a4b-it` through the Gemini API (AI Studio key), **billing enabled → paid-tier terms**
- **Frontend:** Next.js with `output: 'export'`, shadcn/Radix (accessible defaults), served by FastAPI
- **Types:** generate TS types from FastAPI's OpenAPI (`openapi-typescript`)
- **Data:** versioned JSON in the repo, `data/nyc/*.json`. **No database.**
- **Deploy:** single container on Cloud Run
- **Note:** don't count on schema-enforced JSON output for Gemma. Prompt for JSON, then validate with Pydantic.

## 7. Safety & privacy

### Crisis handling (two layers)
1. **Rules check before any Gemma call:** self-harm, overdose, assault/danger, child in danger, medical emergency → crisis card immediately. Can't be prompt-injected, costs nothing.
2. **`safety_flag` in Gemma's intake JSON** for indirect phrasing.

Crisis card: **911**, **988** (call/text), **311** (street outreach). Includes "I'm safe, continue to my plan," so nobody is trapped. Nothing about the crisis is logged. (P4: confirm the current wording on official pages and cite it.)

### ID photo / privacy
- Downscaled in the browser, sent **inline** (base64). **Never the Files API**, which stores uploads ~48h.
- Held in memory only; request bodies are never logged or written to disk.
- Extract only: document type, name, DOB, expiry, issuing state. **No ID number, no address.**
- Profile lives in browser memory only and is gone when the tab closes. Printing is the person's "save."
- Paid-tier API terms so prompts aren't used for training (verify current terms).
- Demo uses a **sample/fake ID**, never a real person's.
- Upload button notice: *"Your photo is read once and never saved."*

### Honesty rules for data
- Never say "verified." Say **"Sourced from [X], retrieved [date] — call to confirm."**
- `null` = unknown, and the UI says "unknown." Never assume.
- No live bed availability claims.

## 8. Dataset (~20 records, Bronx focus + citywide entry points)

| Type | What | Count |
|---|---|---|
| `dropin` | All of NYC Open Data's Directory of Homeless Drop-In Centers | all |
| `intake` | 30th Street (single men), HELP Women's/Franklin (single women), PATH (families w/ children), AFIC (adult families) | 3–4 |
| `idnyc_site` | IDNYC enrollment sites in the Bronx, with hours | 3–4 |
| `rules` | One IDNYC rules file: identity + residency docs, points system (if current), shelter-letter rule, fee/waiver | 1 |
| `meal`/`shower` | Only if time allows | 3–5 |

### Record schema
```json
{
  "id": "bx_dropin_02",
  "type": "dropin | intake | idnyc_site | meal | shower",
  "name": "",
  "address": "",
  "lat": 0.0,
  "lon": 0.0,
  "borough": "Bronx",
  "hours": [{"day": "mon", "open": "08:00", "close": "20:00"}],
  "populations": ["single_adult", "men", "women", "families", "youth"],
  "pets_allowed": null,
  "services": ["meals", "showers", "overnight", "case_management"],
  "phone": "",
  "source_url": "",
  "retrieved_at": "2026-10-24",
  "notes": ""
}
```

### Ranking (deterministic, no AI)
Filter by population and whether it's open at arrival time, then sort by distance.

## 9. Team & roles

| Who | Owns | First deliverable |
|---|---|---|
| **Tim** | Gemma pipeline (intake→profile, plan→placeholder prose, post-check) + frontend | Profile Pydantic model + prompt by 11 PM; rough intake→plan UI by Sat night |
| **P2** | Data: schema, curating ~20 NYC records with sources + dates, IDNYC rules file | Schema agreed by 3 PM; 5 records by 7 PM; all by 11 PM |
| **P3** | Engine: filtering/ranking, IDNYC checklist, stop ordering, Maps links, pytest | Engine working on a hardcoded profile by 7 PM |
| **P4** | Outreach, personas, crisis copy, README/deploy guide, video, **both submissions** | Outreach emails sent tonight; billing/terms checks tonight |

Frontend is part-time but **not "Sunday morning."** Rough UI by Sat night, accessibility polish Sun 9–11 AM.

## 10. Timeline

| When | Checkpoint |
|---|---|
| **Sat 3 PM** | Schema agreed, repo + LICENSE, Cloud Run hello world deployed |
| **Sat 7 PM** | Ugly end-to-end: hardcoded profile → engine → template plan on screen, 5 real records |
| **Sat 11 PM** | Gemma intake (text + photo) → Pydantic profile; placeholder prose + post-check; all ~20 records; crisis layer |
| **Sun 2 AM** | Voice, print view, phone-view mock, accessibility pass. Sleep in shifts after this. |
| **Sun 9:00 AM** | **Feature freeze.** Only bug fixes, README, deploy guide |
| **Sun 10:15 AM** | Video recorded (+ a backup take) |
| **Sun 11:00 AM** | **Submit to BOTH** OrganizerHQ and codingjam.dev (VT chapter). Resubmit if improved. |
| Sun 12:30 PM | Hard deadline |

**Cut rule:** if a checkpoint slips by more than 2 hours, cut the next "if time allows" item (voice, then the phone view). **Never cut** the template fallback or the crisis layer.

## 11. Video (2 minutes)

| Time | Beat | Content |
|---|---|---|
| 0:00–0:15 | Problem | One cited NYC stat (*State of the Homeless*) + caseworker quote or persona |
| 0:15–0:25 | Solution | "One conversation becomes one plan you can print." |
| 0:25–1:15 | Demo | Persona speaks → fake ID → shortlist + IDNYC checklist → day plan → print. 5-second crisis-card aside. |
| 1:15–1:40 | AI & Gemma fit | Gemma parses → code decides → Gemma explains. Placeholders + post-check. Image inline, never stored. |
| 1:40–2:00 | Impact & deploy | One container, one key, cents per plan, self-host Gemma option, open source |

## 12. Validation / outreach (P4, tonight)

- 5–8 **personalized** emails to NYC orgs (Coalition for the Homeless, BronxWorks, Breaking Ground, Urban Pathways, drop-in centers) + a VT / Montgomery County social services caseworker.
- One question: *"What's the hardest part of getting a client from intake to an ID and a bed?"*
- AI can draft them, but **a human reviews each one** and it goes out from a real teammate's address. Say we're a VT student hackathon team. Ask permission before quoting anyone.
- Don't approach people experiencing homelessness directly; go through staff.
- Fallback: two sourced personas + a report stat.

## 13. Open checks (verify before relying on them)

- [ ] Do the $25 Cloud credits cover Gemini API charges? (If not, the paid tier still costs cents; someone needs a card on file.)
- [ ] Current AI Studio / Gemini API data-use terms, free vs. paid tier
- [ ] Current IDNYC document requirements, from nyc.gov (the forms we found are 2016–2018 versions)
- [ ] Current 988 / 311 outreach wording on official pages
- [ ] "Waypoint" name conflicts on GitHub and the web
- [ ] Gemma 4 model IDs available on our API key (`gemma-4-26b-a4b-it`, `gemma-4-31b-it`)

## 14. Sources found so far

- NYC Open Data, Directory of Homeless Drop-In Centers: https://catalog.data.gov/dataset/directory-of-homeless-drop-in-centers
- IDNYC application (shelter letter, free first card): https://www.nyc.gov/assets/idnyc/downloads/pdf/application-materials/application_english.pdf
- IDNYC applicant document guide: https://maps.nyc.gov/assets/idnyc/downloads/2018-pdfs/document-guides/idnyc_applicant_document_guide.pdf
- Gemma on the Gemini API (Google docs): https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
- Gemma 4 via Gemini API / AI Studio guide: https://www.philschmid.de/gemma-4-gemini-api
- Gemma 4 modalities (audio only on E2B/E4B, secondary source): https://www.jetson-ai-lab.com/models/gemma4-e4b

## 15. Why NYC (not Roanoke/Seattle)

NYC is the only region we found where shelters/drop-ins, ID rules, and transit all have open, citable sources. Roanoke has a few providers but no open dataset; Seattle's catalog is a web database, not a download. The README will describe Roanoke as a future deployment: swap the `data/` folder.
