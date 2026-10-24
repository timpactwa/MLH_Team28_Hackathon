# Interior design and virtual tour hackathon plan

Task: T-412. Date: October 24, 2026. Status: proposed product direction; implementation has not started.

## The idea

> Before you sign a lease, see how your life fits.

Help renters imagine an empty apartment as their home. Users provide listing photos, confirm room dimensions, and describe their needs. The app proposes furnished arrangements, checks basic space constraints, and lets users explore a design.

The initial audience is students and renters considering compact homes. The core question is whether a room can accommodate their daily activities and furniture. A virtual tour makes the answer easier to understand.

This proposal follows the team's decision to retire the Waypoint homelessness-resource idea. The existing Waypoint documentation and tasks remain historical context until a separate cleanup updates them. Their product-specific decisions do not describe this proposal. This document does not change existing API contracts or authorize deployment.

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

## Proposed technical approach

| Component | Proposed approach | Decision status |
| --- | --- | --- |
| Web app | Next.js with a Three.js viewer, optionally React Three Fiber | Proposed; confirm before implementation |
| Planning | A multimodal model interprets photos and needs, then proposes structured furniture placements | Model and track choice pending |
| Constraints | Pure geometry checks against the confirmed room model | Core requirement |
| Staging | Gemini image editing generates a furnished reference image | Test image fidelity and account access |
| Optional immersive rendering | World Labs Marble generates a world; Spark renders its Gaussian splats in Three.js | Experimental; requires access, cost, and fidelity checks |
| Reliable tour fallback | Render the confirmed room and furniture as conventional 3D geometry | Default if generated worlds drift |
| Backend | Thin API layer for model calls, validation, and generation jobs | Framework pending |
| Deployment | Prefer a simple web deployment with server-side API credentials | Human approval required before deployment |

Suggested flow: user inputs become a room model and design brief. The planner proposes arrangements, the geometry checker rejects invalid proposals, and the viewer renders an accepted arrangement. Image generation adds a style reference. World generation is optional.

Do not train a reconstruction model during the hackathon. Traditional Gaussian splatting depends on scene imagery and camera reconstruction. Sparse listing photos may lack overlap or omit entire surfaces. Independently edited photos can also disagree about furniture and room structure.

## First feasibility experiment

Time-box the generated-world experiment to 60–90 minutes after access is available. This is a planning budget, not a measured generation time.

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

The MLH track is still open. Gemini image generation does not count toward the Gemma track.

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

Complete the feasibility experiment first. Then build the confirmed room model and a basic viewer. Add the furniture catalog and geometry checks before connecting AI-generated arrangements. Add staging, the optional splat viewer, and visual polish after the core flow works.

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
| 0:00–0:15 | An empty listing photo and the renter's needs |
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
