import { describe, expect, it } from "vitest";
import { catalogById } from "@/data/catalog";
import { demoLayout, demoRoom } from "@/data/demo";
import type { Needs } from "@/lib/schema";
import type { ModelCall, ModelRequest } from "./model";
import { interpretNeeds } from "./needs";
import { numbersAreGrounded, planLayouts } from "./planner";

/** A scripted model: replies are queued per call label and consumed in order. */
function stub(script: Record<string, unknown[]>): ModelCall & { calls: ModelRequest[] } {
  const queues = Object.fromEntries(Object.entries(script).map(([k, v]) => [k, [...v]]));
  const calls: ModelRequest[] = [];
  const fn = (async (req: ModelRequest) => {
    calls.push(req);
    const next = queues[req.label]?.shift();
    if (next === undefined) throw new Error(`stub has no reply left for ${req.label}`);
    const text = typeof next === "string" ? next : "```json\n" + JSON.stringify(next) + "\n```";
    return { text, latencyMs: 10, usage: { inputTokens: 100, outputTokens: 50 } };
  }) as ModelCall & { calls: ModelRequest[] };
  fn.calls = calls;
  return fn;
}

const needs: Needs = {
  text: "Full bed, a desk to work from home, a big sofa, somewhere to eat.",
  items: [
    { itemId: "bed-full", quantity: 1 },
    { itemId: "nightstand", quantity: 1 },
    { itemId: "desk-compact", quantity: 1 },
    { itemId: "chair-desk", quantity: 1 },
    { itemId: "sofa-3seat", quantity: 1 },
    { itemId: "table-bistro", quantity: 1 },
  ],
  clearances: [],
};

const strip = (ps: typeof demoLayout.placements) => ps.map(({ itemId, x, y, rotation }) => ({ itemId, x, y, rotation }));
const move = (ps: ReturnType<typeof strip>, itemId: string, x: number, y: number) =>
  ps.map((p) => (p.itemId === itemId ? { ...p, x, y } : p));

const bad = strip(demoLayout.placements); // sofa in the door swing
const fixed = move(bad, "sofa-3seat", 100, 150);
const other = move(fixed, "table-bistro", 80, 100);

const input = { room: demoRoom, needs, catalog: catalogById };

describe("planLayouts", () => {
  it("rejects the sofa in the door swing, revises, and records both rounds", async () => {
    const model = stub({
      "plan.propose": [
        {
          layouts: [
            { name: "Sofa by the door", rationale: "Sofa faces the window.", placements: bad },
            { name: "Dining by the window", rationale: "Table in the light.", placements: other },
          ],
        },
      ],
      "plan.revise": [{ name: "Sofa by the door", rationale: "Moved the sofa east.", placements: fixed }],
      "plan.explain": [
        {
          explanations: [
            "We slid the sofa 28 in east so the door opens freely.", // 28 is not a fact: falls back
            "The table sits by the window and the sofa is clear of the door.",
          ],
        },
      ],
    });

    const { options, usage } = await planLayouts(model, input);

    expect(options).toHaveLength(2);
    const [a, b] = options;
    expect(a.attempts).toHaveLength(2);
    expect(a.attempts[0].check.violations[0]).toMatchObject({ code: "door_swing" });
    expect(a.status).toBe("fits");
    expect(a.explanationSource).toBe("template");
    expect(a.explanation).toContain("1 revision");

    expect(b.attempts).toHaveLength(1);
    expect(b.status).toBe("fits");
    expect(b.explanationSource).toBe("model");

    // The revision prompt carries the checker's exact message back to the model.
    const revise = model.calls.find((c) => c.label === "plan.revise")!;
    expect(revise.prompt).toContain("Three-seat sofa is in the swing of the door on the south wall by 14 in.");
    expect(usage.calls).toBe(3);
  });

  it("stops after two revisions and reports doesnt_fit, never passing", async () => {
    const model = stub({
      "plan.propose": [{ layouts: [{ name: "Stubborn", rationale: "", placements: bad }] }],
      "plan.revise": [
        { name: "Stubborn", rationale: "", placements: bad },
        { name: "Stubborn", rationale: "", placements: bad },
      ],
      "plan.explain": ["not json at all", "still not json"],
    });
    const { options } = await planLayouts(model, input);
    expect(options[0].status).toBe("doesnt_fit");
    expect(options[0].attempts).toHaveLength(3);
    expect(options[0].check.ok).toBe(false);
    expect(options[0].explanation).toMatch(/still does not fit after 2 revisions/);
  });

  it("treats a layout that drops a requested item as failing", async () => {
    const withoutTable = bad.filter((p) => p.itemId !== "table-bistro" && p.itemId !== "sofa-3seat");
    const model = stub({
      "plan.propose": [{ layouts: [{ name: "Sparse", rationale: "", placements: withoutTable }] }],
      "plan.revise": [{ name: "Full", rationale: "", placements: fixed }],
      "plan.explain": [{ explanations: ["Everything you asked for fits."] }],
    });
    const { options } = await planLayouts(model, input);
    expect(options[0].attempts[0].missing).toEqual(["1 x Three-seat sofa", "1 x Two-seat bistro table"]);
    expect(options[0].status).toBe("fits");
  });
});

describe("interpretNeeds", () => {
  it("retries when the model names an item outside the catalog", async () => {
    const model = stub({
      needs: [
        { items: [{ itemId: "hot-tub", quantity: 1 }], clearances: [] },
        {
          items: [
            { itemId: "bed-twin", quantity: 1 },
            { itemId: "bed-twin", quantity: 1 },
          ],
          clearances: [{ kind: "turning_circle", diameter: 60 }],
          style: "warm minimal",
        },
      ],
    });
    const r = await interpretNeeds(model, "two twin beds, I use a wheelchair");
    expect(model.calls).toHaveLength(2);
    expect(model.calls[1].prompt).toContain("previous reply was invalid");
    expect(r.needs.items).toEqual([{ itemId: "bed-twin", quantity: 2 }]);
    expect(r.needs.clearances).toEqual([{ kind: "turning_circle", diameter: 60 }]);
  });
});

describe("numbersAreGrounded", () => {
  it("accepts only listed numbers", () => {
    expect(numbersAreGrounded("Moved 14 in.", new Set([14]))).toBe(true);
    expect(numbersAreGrounded("Saves $300 a month.", new Set([14]))).toBe(false);
  });
});
