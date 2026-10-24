# Interior design and virtual tour hackathon plan

Date: October 24, 2026. Status: **decisions locked** after a team grilling session. The work is tracked in [TASKS.md](TASKS.md).

## Locked decisions

These override anything later in this document that conflicts with them. To change one, raise it in the team chat; don't edit it here on your own.

| # | Decision | Locked choice |
| --- | --- | --- |
| D1 | User and housing decision | Students and renters deciding whether a smaller, cheaper unit fits their life before they sign. The showpiece is a wheelchair-clearance check (60 in turning circle, door clearance), framed as "checked against the room model you confirmed," never as accessibility certification. Theme areas: affordability, housing search, accessible housing. |
| D2 | Tracks | MLH: **Best UI/UX** (the only MLH track we enter). GDG: **Best Overall AI for Housing**. Gemma 4 remains the planner even though we are not entering the Gemma track. |
| D3 | What the AI does (Gemma 4) | (1) Read the photo: estimate door and window positions and proportions to fill in the room editor, all labeled *estimated* until the user confirms. (2) Turn free-text needs into catalog furniture items plus clearance requirements. (3) Propose two layouts as JSON. Geometry code returns specific errors, Gemma revises (at most 2 rounds) and explains the tradeoffs. If a layout still fails, say plainly that it doesn't fit. |
| D4 | What users see | Three layers, built in this order: **(a)** a Three.js / R3F 3D room built from the confirmed geometry, plus a 2D plan with clearance zones, WASD and click-to-move walkthrough (core); **(b)** a Gemini-staged version of the original photo, shown side by side as a "style concept"; **(c)** a World Labs Marble world, **pre-generated** and labeled "AI concept, not to scale. The 3D plan is what we checked." |
| D5 | World Labs guardrails | Nobody starts it until (a) works end to end. One owner, in separate files. **Kill rule:** if it doesn't load in the browser by Sun 2 AM, or it invents doors, it becomes a concept preview or gets cut. Cost is about $1.26 per standard world or $0.18 per draft, sold in $5 minimums out of pocket. Generation takes about 5 minutes, so it is never live in the video. |
| D6 | Team lanes | Frontend/UX: Tim. AI: P2. Geometry and data: P3. Visuals and ship: P4. Names to be filled in. |
| D7 | Stack | TypeScript everywhere: Next.js (App Router), React Three Fiber + drei, Tailwind, Zod schemas, `@google/genai`, and a pure-TS geometry module shared by the browser and the server. Hosted on Vercel's free plan with the key in its environment variables (moved off Cloud Run on 2026-10-24: no Google Cloud credits left). No database. |
| D8 | Demo room | A free-licensed empty-room photo (Unsplash or Pexels; license link in the README), with dimensions labeled "example dimensions, not measured." The demo shows Gemma's estimates being corrected by the user. |
| D9 | Timeline | Sat +1 hr: schema locked, repo licensed, hello-world deployed. Sat 6 PM: skeleton working end to end. Sat midnight: full loop deployed, sofa rejection demo-able. Sun 2 AM: World Labs kill decision. Sun 9 AM: feature freeze. Sun 11:00–11:30 AM: both submissions in. |
| D10 | Cut order | Cut in this order: World Labs, then the staged photo, then Gemma reading the photo (fall back to manual entry). **Never cut:** the geometry checks, the propose → check → revise loop, the 3D room, the accessible non-3D summary. |

## The idea

> Before you sign a lease, see how your life fits.

Help renters imagine an empty apartment as their home. Users provide listing photos, confirm room dimensions, and describe their needs. The app proposes furnished arrangements, checks basic space constraints, and lets users explore a design.

The initial audience is students and renters considering compact homes. The core question is whether a room can accommodate their daily activities and furniture. A virtual tour makes the answer easier to understand.

This replaces the retired Waypoint homelessness-resource idea. Its docs were removed and are still in git history.

## The problem and product promise

Empty listing photos make it difficult to imagine furniture placement, usable floor space, and tradeoffs between arrangements. Photos also leave dimensions and unseen areas uncertain.

Our hypothesis is that a personalized layout helps renters evaluate whether a smaller home meets their needs. We must validate that hypothesis with apartment hunters. We do not yet claim that the product saves money, reduces wasted visits, or improves housing access.

Example user request:

> I'm considering this studio. I need a bed, a desk for working from home, a small sofa, and somewhere to eat. Can I arrange those without blocking the door?

The app offers two arrangements and explains their compromises. The user selects one to explore. Checks apply to the dimensions and openings the user confirms.

## The hackathon experience

1. Upload photos of one empty room. Use a prepared example if the user has no photos.
2. Enter room dimensions and confirm door and window positions in a simple room editor.
3. Select furniture needs and a visual style.
4. Generate two arrangements using a small furniture catalog with known dimensions.
5. Check room boundaries, furniture overlap, and doorway clearance. Revise an invalid arrangement or explain why the requested furniture does not fit.
6. Compare the arrangements and select one.
7. Explore a 3D room with WASD, mouse look, and alternative click controls. View a readable summary without entering the tour.
8. Compare the original photo with the proposed design and inspect which dimensions were supplied versus estimated.

The memorable demo moment is a rejected arrangement. An oversized sofa overlaps the doorway in the supplied room model. The app identifies the conflict and proposes a smaller sofa or a different placement.

## Scope for the weekend

| Build | Defer |
| --- | --- |
| One room with a simple, confirmed shape | Connected rooms and whole-house reconstruction |
| Uploaded photos and a prepared example | Import from arbitrary listing websites |
| Manual dimension and opening confirmation | Reliable measurement from photos alone |
| Small furniture catalog with known sizes | Full shopping catalogs and checkout |
| Two arrangements with explanations | Unlimited conversational editing |
| Basic geometric checks | Building-code or accessibility certification |
| One explorable result | Multiplayer, VR, and avatars |
| Furniture, colors, and finishes | Structural renovations and wall removal |

For the first room editor, a rectangular room is sufficient. Furniture can use simple 3D models or boxes at the catalog dimensions. Visual polish comes after the complete flow works.

## Keep geometry separate from generated imagery

The room model is the source for fit checks. It contains user-confirmed dimensions, openings, furniture sizes, positions, and rotations. Store dimensions in one consistent unit.

The planner proposes furniture arrangements. Deterministic code checks those proposals. At minimum, reject furniture outside the room, intersecting furniture footprints, and furniture inside the configured doorway clearance area. These checks do not establish that every route through the room is traversable.

The image editor produces a visual design reference. A prompt to preserve walls and windows does not guarantee geometric accuracy.

A generated 3D world is an approximate visualization. Its appearance, collider mesh, and apparent scale do not prove that furniture fits the actual apartment. Keep the measured layout visible as a separate view unless the tour demonstrably matches it.

## Technical approach (see D7)

| Component | Proposed approach | Decision status |
| --- | --- | --- |
| Web app | Next.js (App Router), React Three Fiber + drei, Tailwind | Locked (D7) |
| Planning | Gemma 4 via `@google/genai`: reads the photo, converts needs to furniture, proposes layouts, revises from checker errors (D3) | Locked; confirm model ID available to the key |
| Constraints | Pure-TS geometry module, shared by the editor (live) and the server (loop) | Locked, never cut |
| Staging | Gemini image editing generates a furnished style concept | Locked as layer (b); test fidelity |
| Immersive concept | World Labs Marble world, rendered with Spark in Three.js, pre-generated | Layer (c); kill rule D5 |
| Core tour | Confirmed room and furniture as conventional 3D geometry | Layer (a), the core |
| Backend | Next.js API routes; Zod validates all model JSON | Locked (D7) |
| Deployment | Vercel free plan; `GEMINI_API_KEY` in Vercel environment variables; AI Studio key on its free tier | Locked; a human runs the deploy |

Suggested flow: user inputs become a room model and design brief. The planner proposes arrangements, the geometry checker rejects invalid proposals, and the viewer renders an accepted arrangement. Image generation adds a style reference. World generation is optional.

Do not train a reconstruction model during the hackathon. Traditional Gaussian splatting depends on scene imagery and camera reconstruction. Sparse listing photos may lack overlap or omit entire surfaces. Independently edited photos can also disagree about furniture and room structure.

## World Labs experiment (layer c, after core works)

Time-box it to 60–90 minutes. The kill rule is in D5.

Use one permitted empty-room photo. Generate a furnished edit, then generate an explorable world from that edit. Inspect the result from several positions.

Record whether the outputs preserve visible doors, windows, room proportions, and furniture placement. Look for invented openings, distorted furniture, and broken unseen surfaces. Check that the exported assets load in a browser. Measure actual latency and cost for both generation stages.

Use the generated-world route only if the result supports an honest, coherent demo. Otherwise, use the confirmed room geometry for the walkthrough and keep the furnished image as a separate inspiration preview. A stationary panorama is another optional visual fallback, but does not provide free movement.

## Fit to the recorded judging rubric

Point values confirmed against the event deck (slides 14–15).

| Criterion | Points | Evidence to build or collect |
| --- | ---: | --- |
| Problem definition | 10 | One renter persona evaluating a compact apartment for specific daily needs |
| Impact multiplier | 10 | Reusable workflow across rooms; clearly separate intended benefits from measured outcomes |
| Stakeholder empathy | 5 | Interview 3–5 apartment hunters; record one product change based on their feedback |
| AI integration and necessity | 15 | Photo and needs interpretation, arrangement proposals, and visual staging |
| Architectural soundness | 10 | Structured placements, deterministic checks, bounded revisions, and a usable fallback |
| Safety and grounding | 10 | Label estimates and generated views; demonstrate rejection of an invalid placement |
| Privacy and data ethics | 8 | Permitted images, disclosure of external processing, minimal retention, and protected credentials |
| Inclusive design | 7 | Keyboard navigation, click controls, reduced motion, and a readable non-3D summary |
| Deployment viability | 10 | Complete hosted flow and prepared example; deployment requires human approval |
| Inference cost | 8 | Actual measured cost per design, retry limits, and reuse of completed results |
| Documentation | 7 | Setup, dependencies, architecture, limitations, sample inputs, and reproducible demo |

An attractive tour alone leaves much of this rubric unanswered. The constraint demonstration, user feedback, and accessible alternative carry substantial judging value.

## Track strategy and event requirements

Confirmed from the event deck (slides 7, 8, 12). It supersedes the event web page, which lists a different set of tracks.

- **MLH tracks (pick only ONE):** Best Open-Source AI Project, Best Use of Gemma 4 ("core to how the product works, not added at the end"), Best Use of Google Cloud, Best UI/UX ("polished, accessible, intuitive experience with a clear user flow").
- **GDG track:** Best Overall AI for Housing, submitted separately on codingjam.dev under the Virginia Tech chapter entry.
- **Submission:** public GitHub repo with an open-source license file, a two-minute video, project name, description and tech used. Window is Sunday 11:00 AM–12:30 PM, and 12:30 PM is the hard deadline. Late submissions are not accepted.
- The deck's theme slide says "Creative builds welcome, including AI-designed tiny homes, if they solve a real need." The design direction fits, provided the housing need is validated.

**Chosen:** Best UI/UX and the GDG Housing track (D2).

## Responsible product behavior

- Preserve the original photo for comparison and label generated images as design concepts.
- Mark each dimension as user-supplied or estimated. Do not turn an estimate into a measured fact.
- Describe checks as checks against the supplied room model. Do not claim construction accuracy, code compliance, or certified accessibility.
- Exclude structural renovation advice from the demo. Cosmetic changes remain design concepts.
- Use images the team has permission to process and display. Start with uploads rather than scraping listing sites.
- Disclose external model processing and choose retention settings before accepting personal photos. Do not promise deletion the application cannot enforce.
- Keep API keys on the server. Avoid logging photos or unnecessary personal information.
- Make the design understandable without mouse look, motion, or a 3D canvas.

## Build order and acceptance criteria

Follow D4/D5: build the schema, geometry checks and the 3D room first, then the Gemma loop, then the staged photo. Start the World Labs experiment (below) only after the core flow works end to end.

The demo is ready when the following checks pass:

- [ ] A new user can open the prepared example and understand the housing decision.
- [ ] The app accepts confirmed room dimensions and openings.
- [ ] The planner returns two arrangements or clearly explains that the request cannot fit.
- [ ] Real geometry code rejects an oversized item or doorway obstruction.
- [ ] A revised arrangement passes the implemented checks.
- [ ] The selected design opens in a working viewer.
- [ ] A non-3D summary communicates the furniture arrangement and limitations.
- [ ] Generation failures and retries have bounded behavior and useful feedback.
- [ ] Measured cost and latency are recorded with the models and inputs used.
- [ ] The team confirms submission rules and produces the required documentation and video.

## Proposed two-minute demo

| Time | What to show |
| --- | --- |
| 0:00–0:15 | An empty-room photo and the renter's needs (cheaper studio vs a pricier one-bedroom, works from home, a friend who uses a wheelchair) |
| 0:15–0:35 | Confirmed dimensions, furniture requirements, and style |
| 0:35–1:00 | Two arrangements, a rejected oversized sofa, and the corrected layout |
| 1:00–1:30 | Walk through the selected design and compare with the original |
| 1:30–1:45 | Measured versus estimated information and the accessible summary |
| 1:45–2:00 | User feedback, architecture, actual cost, and known limits |

Keep a completed example available if generation is slow. Label prerecorded or cached results clearly. Do not present a cached generation as a live model call.

## Reference links

- [Virginia Tech event page](https://gdg.community.dev/events/details/google-gdg-on-campus-virginia-tech-university-blacksburg-united-states-presents-gdg-build-with-ai-x-hacktoberfest/)
- [Gemini image generation and editing](https://ai.google.dev/gemini-api/docs/image-generation)
- [World Labs API documentation](https://docs.worldlabs.ai/api)
- [Spark Gaussian splat renderer](https://sparkjs.dev/docs/overview/)
- [Original 3D Gaussian Splatting research](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)

These links informed the proposal. Account access, current pricing, licenses, and the full pipeline still require testing. No claim in this plan establishes that the proposed integration already works.
