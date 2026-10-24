# Cost and latency (T-408)

**Status: not measured yet.** This needs a server with `GEMINI_API_KEY` set. Don't fill these numbers in by estimating.

## How to measure

```bash
npm run build && npm start                     # or use the deployed URL
npm run measure -- http://localhost:3000 --runs 3 --photo public/demo/room.jpg
```

- `scripts/measure.mjs` runs one full design per run: needs, plan, and, with `--photo`, the photo estimate and the staged concept.
- It prints calls, tokens, model latency and wall time for each step. Paste the tables below.
- To add a cost column, set `PRICE_IN` and `PRICE_OUT` (USD per 1M tokens) from the current Gemini API pricing page.
- On the free tier, the cost is $0, but there are rate limits. Record those limits as well.
- Image output from the staging model may be priced per image rather than per token. Check its pricing page and note it here.

## Setup used

- Date:
- Server: local / Vercel URL
- `GEMMA_MODEL`:
- `STAGING_MODEL`:
- Key tier: free / paid
- Inputs: the example studio (`data/demo-room.json`), the example needs text, and the T-406 photo

## Results

_Paste the script output here._

## Limits built into the app

- **Plan:** at most 2 revisions per option, so at most 6 model calls per plan (one proposal, up to 2 revisions per option, one explanation). Invalid JSON gets one retry per call.
- **Needs and photo:** one call each, plus one retry on invalid JSON.
- **Staged concept:** one call. It is cached in the browser for the photo, style and furniture, so showing it again costs nothing.
- **Timeouts:** 45 s per Gemma call and 90 s per image call, so a stuck request fails rather than running up a bill.
- **The prepared example and "Arrange it myself"** make no model calls.
