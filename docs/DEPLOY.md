# Deploying (T-401, T-402)

The app is hosted on Vercel's free (Hobby) plan. It used to target Cloud Run, but the Google Cloud credits ran out, so the Dockerfile and Secret Manager setup were removed on 2026-10-24.

A human runs the deploy. Agents prepare files and stop there (see AGENTS.md).

## What ships

- A standard Next.js 16 app. Vercel builds it with `npm run build`, with no extra config.
- There's no database, and the server writes nothing to disk.
- `GEMINI_API_KEY` is the only secret. It lives in Vercel's environment variables, never in the repo.
- Without the key the app still works. `/api/*` returns 503, and the UI offers the prepared example and "Arrange it myself".

## The AI key (no billing needed)

1. Go to aistudio.google.com, sign in, and choose **Get API key**. Create the key in a new project, and leave billing off.
2. That key's free tier covers Gemma. It is rate-limited, so check the current limits for the Gemma model on the AI Studio rate-limit page and record them below.
3. The staged-photo concept (T-403) uses a Gemini image model. Image output may not be included in the free tier. If it isn't, `/api/stage` reports that it is unavailable, and the rest of the app is unaffected.

## Deploy on Vercel

**Option A, from GitHub (recommended):**
1. Go to vercel.com/new and import this repo. Vercel detects Next.js.
2. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: the AI Studio key, for Production and Preview.
   - `GEMMA_MODEL`: optional, defaults to `gemma-4-26b-a4b-it`.
   - `STAGING_MODEL`: optional, see `.env.example`.
3. Press **Deploy**. Every push to `main` then redeploys.

**Option B, from a laptop:**

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest env add GEMINI_API_KEY production   # paste at the prompt, not in the command
npx vercel@latest --prod
```

### Limits that matter

- Request bodies are capped at 4.5 MB. Photos are downscaled in the browser to about 100 KB first.
- `/api/plan` sets `maxDuration = 300`. One plan can make up to six model calls (propose, two revisions per option, explain), each with a 45 s limit.

## Backup: run it from a laptop

If the hosted version breaks during judging:

```bash
npm ci && npm run build && npm start   # http://localhost:3000, reads .env.local
```

To share it, use a free tunnel such as `cloudflared tunnel --url http://localhost:3000`.

## After deploying (T-402)

- [ ] Open the URL, use the example studio, and go through to the 3D walkthrough.
- [ ] `/api/needs` answers with a list rather than a 503, which shows the key is wired up.
- [ ] In Vercel's runtime logs, check for `model_call` lines (label, model, latency and tokens only; no prompts or photos).

## Free-tier limits: to record

- [ ] Gemma requests per minute and per day on the AI Studio key: _fill in_
- [ ] Whether the image model works without billing: _fill in_

Record the answers here. Don't guess.
