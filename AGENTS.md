# AGENTS.md: rules for every human and AI agent

Read this before doing anything in the repo.

## Source of truth
- **[INTERIOR_DESIGN_PLAN.md](INTERIOR_DESIGN_PLAN.md):** the product, scope, architecture and open decisions. A task checklist (`TASKS.md`) will be regenerated once the open decisions are locked.

## Workflow
1. `git pull --rebase` before starting.
2. Small commits with clear messages. Don't push failing builds or tests to `main`.
3. If a decision in the plan seems wrong, raise it in the team chat; don't silently change it.

## Standing rules
- Geometry checks run in deterministic code against the user-confirmed room model. Model output is a proposal, never the source of truth for fit.
- Label generated images and 3D views as design concepts. Mark every dimension as user-supplied or estimated.
- Secrets (API keys) come from the environment, never committed. Don't log user photos.
- Agents: don't send emails, submit, or deploy without a human's explicit go-ahead.
