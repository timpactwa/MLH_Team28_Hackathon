# AGENTS.md: rules for every human and AI agent

Read this before doing anything in the repo.

## Sources of truth
- **[TASKS.md](TASKS.md):** what to work on, and the claim protocol for parallel agents. Every change maps to a task ID.
- **[INTERIOR_DESIGN_PLAN.md](INTERIOR_DESIGN_PLAN.md):** the product, scope, architecture and open decisions. Locked decisions D1–D10.

## Workflow
1. `git pull --rebase` before starting.
2. Small commits with clear messages. Don't push failing builds or tests to `main`.
3. If a decision in the plan seems wrong, raise it in the team chat; don't silently change it.

## Standing rules
- Geometry checks run in deterministic code against the user-confirmed room model. Model output is a proposal, never the source of truth for fit.
- Label generated images and 3D views as design concepts. Mark every dimension as user-supplied or estimated.
- Secrets (API keys) come from the environment, never committed. Don't log user photos.
- Agents: don't send emails, submit, or deploy without a human's explicit go-ahead.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
