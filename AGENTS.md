# AGENTS.md: rules for every human and AI agent on Waypoint

Read this before doing anything in the repo.

## Sources of truth
1. **[TASKS.md](TASKS.md):** what to work on. **Everything you do maps to a task ID.** No task, no work: add one first.
2. **[BRAINSTORM.md](BRAINSTORM.md):** why, and the locked decisions (stack, scope, safety, privacy, data rules). Don't reopen decisions; propose a change in the team chat.

## Workflow
1. `git pull --rebase`
2. Claim one task in TASKS.md using its **claim protocol** (edit only that task's `status:` line, commit, push). If the push is rejected, pull and re-check.
3. Work **only in that task's `paths`.** Need something outside them? Add a new task or ask the owner. Don't edit it yourself.
4. Small commits, message prefixed with the task ID: `T-301: filter by arrival time`.
5. Run `cd backend && pytest` before pushing. Don't push failing tests to `main`.
6. When finished, update the task's checkboxes and `status`, then push.
7. If you're blocked, set `status: blocked: <reason>` and move on.

## Locked rules (from BRAINSTORM; don't violate them)
- **The model never supplies facts.** Addresses, hours, phones and requirements come from `data/` records. Gemma writes prose around `{{placeholders}}`; `grounding.py` fills them and runs the post-check.
- **Crisis rules check runs before any Gemma call.**
- **ID images:** inline base64 only, never the Files API, never written to disk, never logged. Extract only doc type, name, DOB, expiry and issuing state.
- **No database, no server-side profile storage, no localStorage of profiles.**
- **Never write "verified."** Use "Sourced from X, retrieved DATE — call to confirm." `null` = unknown.
- **No real-time bed availability claims.**
- Secrets (`GEMINI_API_KEY`) come from the environment or Cloud Run secrets, never committed.
- Only one MLH track: **Best Use of Gemma 4.** Plus the GDG Housing track.

## Repo layout
```
backend/app/        FastAPI app: main.py, models.py, gemma.py, intake.py, crisis.py,
                    grounding.py, explain.py, template.py, prompts/
backend/app/engine/ ranking.py, idnyc.py, itinerary.py (pure Python, no AI)
backend/tests/      pytest
backend/scripts/    validate_data.py
data/nyc/           dropins.json, intake.json, idnyc_sites.json, idnyc_rules.json, services.json, crisis.json
frontend/           Next.js, output: 'export', served by FastAPI
docs/               DEPLOY.md, DATA.md, placeholders.md, validation.md, personas.md
demo/               sample_id.jpg, script.md
```

## For AI agents specifically
- Parallel agents each claim **different** tasks with non-overlapping `paths`. Identify yourself in the claim as `person/agent-name`.
- Code against the **contracts** (`models.py`, the API routes). If a contract seems wrong, stop and flag it; don't change it.
- Don't send emails, submit forms or deploy without a human's explicit go-ahead.
- Before marking a task `done`, re-read its "Done when" list and check every box honestly.
