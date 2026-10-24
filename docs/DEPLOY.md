# Deploying to Cloud Run (T-401, T-402)

A human runs every command that touches Google Cloud. Agents prepare files and stop there (see AGENTS.md).

## What ships

- `Dockerfile` builds the Next.js standalone server (`output: "standalone"` in `next.config.ts`) on `node:22-alpine` and runs it as a non-root user on port 8080.
- The image holds no secrets. `GEMINI_API_KEY` comes from Secret Manager at run time.
- Without the key the app still works: `/api/needs` and `/api/plan` return 503, and the UI offers the prepared example and "Arrange it myself".

Checked locally on 2026-10-24: the standalone server (`node .next/standalone/server.js` with `.next/static` copied in) serves `/`, `/editor` and the static CSS, and `/api/needs` returns 503 without a key. **The Docker image itself has not been built yet**, because Docker Desktop was not running. Run `docker build -t room-fit .` once before the first deploy.

## One-time setup

Replace `PROJECT_ID`. `us-east1` is the closest region to Blacksburg.

```bash
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# Store the key. Type or paste it at the prompt so it stays out of shell history.
read -rs GEMINI_API_KEY && printf %s "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- && unset GEMINI_API_KEY

# Let the Cloud Run runtime service account read it.
PROJECT_NUMBER=$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
```

## Deploy

From the repo root. Cloud Build builds the `Dockerfile`, so Docker isn't needed on your machine.

```bash
gcloud run deploy room-fit \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars=GEMMA_MODEL=gemma-4-26b-a4b-it \
  --memory 1Gi --cpu 1 \
  --timeout 300 \
  --max-instances 3
```

- `--timeout 300`: one plan request can make up to six model calls (propose, two revisions per option, explain), each with a 45 s limit.
- `--max-instances 3` caps the cost if the URL gets passed around.
- During judging, consider `--min-instances 1` to avoid a cold start on the first click. It costs a little while it is on, so set it back to 0 afterwards.

## After deploying (T-402)

- [ ] Open the URL, use the example studio, and go through to the 3D walkthrough.
- [ ] `/api/needs` answers with a list rather than a 503, which shows the secret is wired up.
- [ ] Check the logs for `model_call` lines (label, model, latency, tokens only; no prompts or photos).

## Credits and billing: still to confirm

- [ ] Which services the $25 credits cover: Cloud Run, Cloud Build, Artifact Registry, Secret Manager.
- [ ] Whether Gemini API usage bills to the same project and credits, or to the AI Studio key's own billing.

Record the answers here. Don't guess.
