// T-408: measures calls, tokens and latency for one full design, against a running server with a key.
//
//   node scripts/measure.mjs [baseUrl] [--runs 3] [--photo public/demo/room.jpg]
//
// baseUrl defaults to http://localhost:3000. Prints a Markdown table to paste into docs/COST.md.
// Token prices are not built in: pass PRICE_IN and PRICE_OUT (USD per 1M tokens) to get a cost column,
// or leave them unset on the free tier. The photo is read from disk and sent to the server only.

import { readFileSync } from "node:fs";
import { extname } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/$/, "");
const runs = Number(flag("runs", "3"));
const photoPath = flag("photo", null);
const priceIn = Number(process.env.PRICE_IN ?? NaN);
const priceOut = Number(process.env.PRICE_OUT ?? NaN);

const room = JSON.parse(readFileSync(new URL("../data/demo-room.json", import.meta.url), "utf8"));
const text =
  "I use a wheelchair, so I need room to turn around. I want a full bed with a nightstand, a small desk and chair for school, a small couch for when friends visit, and a little table for two.";
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function post(path, body) {
  const started = performance.now();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const wallMs = Math.round(performance.now() - started);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} returned ${res.status}: ${json.error ?? "no body"}`);
  return { json, wallMs };
}

const rows = [];
const record = (step, run, { json, wallMs }, extra = "") =>
  rows.push({ step, run, wallMs, ...(json.usage ?? {}), extra });

for (let run = 1; run <= runs; run++) {
  const needs = await post("/api/needs", { text });
  record("needs", run, needs, `${needs.json.needs.items.length} items`);

  const plan = await post("/api/plan", { room, needs: needs.json.needs });
  const verdicts = plan.json.options.map((o) => `${o.status} after ${o.attempts.length} round(s)`).join("; ");
  record("plan", run, plan, verdicts);

  if (photoPath) {
    const mimeType = MIME[extname(photoPath).toLowerCase()];
    if (!mimeType) throw new Error("--photo must be .jpg, .png or .webp");
    const photo = { mimeType, data: readFileSync(photoPath).toString("base64") };
    record("photo", run, await post("/api/photo", { photo }));
    record("stage", run, await post("/api/stage", { photo, style: "Warm and cozy", items: needs.json.needs.items }));
  }
  process.stderr.write(`run ${run}/${runs} done\n`);
}

const cost = (r) =>
  Number.isNaN(priceIn) || Number.isNaN(priceOut)
    ? "n/a"
    : `$${(((r.inputTokens ?? 0) * priceIn + (r.outputTokens ?? 0) * priceOut) / 1e6).toFixed(4)}`;

console.log(`Measured ${new Date().toISOString()} against ${base}, ${runs} run(s).\n`);
console.log("| Step | Run | Calls | Input tokens | Output tokens | Model ms | Wall ms | Cost | Result |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
for (const r of rows) {
  console.log(
    `| ${r.step} | ${r.run} | ${r.calls ?? ""} | ${r.inputTokens ?? ""} | ${r.outputTokens ?? ""} | ${r.latencyMs ?? ""} | ${r.wallMs} | ${cost(r)} | ${r.extra} |`,
  );
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log("\n| Step | Median wall ms | Median calls |\n| --- | ---: | ---: |");
for (const step of [...new Set(rows.map((r) => r.step))]) {
  const of = rows.filter((r) => r.step === step);
  console.log(`| ${step} | ${median(of.map((r) => r.wallMs))} | ${median(of.map((r) => r.calls ?? 0))} |`);
}
