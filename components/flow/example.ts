import { catalogById } from "@/data/catalog";
import { demoRoom } from "@/data/demo";
import { checkLayout } from "@/lib/geometry";
import { emptyUsage } from "@/lib/ai/model";
import { templateExplanation, type Attempt, type PlannedLayout, type PlanResult } from "@/lib/ai/planner";
import type { Layout, Needs, Opening, Placement, Room } from "@/lib/schema";

export const EXAMPLE_NEEDS_TEXT =
  "I use a wheelchair, so I need room to turn around. I want a full bed with a nightstand, a small desk and chair for school, a small couch for when friends visit, and a little table for two.";

/** What the needs step fills in when the AI is offline and the text is the example's. */
export const exampleNeeds: Needs = {
  text: EXAMPLE_NEEDS_TEXT,
  items: [
    { itemId: "bed-full", quantity: 1 },
    { itemId: "nightstand", quantity: 1 },
    { itemId: "desk-compact", quantity: 1 },
    { itemId: "chair-desk", quantity: 1 },
    { itemId: "sofa-loveseat", quantity: 1 },
    { itemId: "table-bistro", quantity: 1 },
  ],
  clearances: [{ kind: "turning_circle", diameter: 60 }],
  style: "Warm and cozy",
};

const P = (itemId: string, x: number, y: number, rotation: Placement["rotation"] = 0): Placement => ({
  id: itemId,
  itemId,
  x,
  y,
  rotation,
});

/** Option 1's first round puts the couch in the door swing; the second round slides it east. */
const ROUNDS_A: Layout[] = [
  {
    id: "option-1",
    name: "Bed under the window",
    rationale: "Bed and nightstand on the north wall, desk in the north-east corner, couch on the south wall facing the room.",
    placements: [
      P("bed-full", 28, 38.5),
      P("nightstand", 66, 8),
      P("desk-compact", 114, 10),
      P("chair-desk", 114, 34),
      P("sofa-loveseat", 58, 150),
      P("table-bistro", 125, 100),
    ],
  },
  {
    id: "option-1",
    name: "Bed under the window",
    rationale: "Same plan, with the couch moved east so the door can open fully.",
    placements: [
      P("bed-full", 28, 38.5),
      P("nightstand", 66, 8),
      P("desk-compact", 114, 10),
      P("chair-desk", 114, 34),
      P("sofa-loveseat", 75, 151),
      P("table-bistro", 125, 100),
    ],
  },
];

const ROUNDS_B: Layout[] = [
  {
    id: "option-2",
    name: "Bed on the east wall",
    rationale: "Bed in the north-east corner, desk along the west wall, couch on the east wall, table by the door.",
    placements: [
      P("bed-full", 116, 38.5),
      P("nightstand", 78, 8),
      P("desk-compact", 10, 60, 90),
      P("chair-desk", 32, 60),
      P("sofa-loveseat", 127, 120, 90),
      P("table-bistro", 15, 120),
    ],
  },
];

function plan(rounds: Layout[], room: Room, needs: Needs): PlannedLayout {
  const attempts: Attempt[] = rounds.map((layout, round) => ({
    round,
    layout,
    check: checkLayout({ room, placements: layout.placements, catalog: catalogById, clearances: needs.clearances }),
    missing: [],
  }));
  const final = attempts.at(-1)!;
  const planned: PlannedLayout = {
    status: final.check.ok ? "fits" : "doesnt_fit",
    layout: final.layout,
    check: final.check,
    missing: [],
    attempts,
    explanation: "",
    explanationSource: "template",
  };
  planned.explanation = templateExplanation(planned);
  return planned;
}

/**
 * The prepared example for when the AI is offline. The layouts are hand-written,
 * but every round goes through the same checker as the AI's layouts, live.
 */
export function examplePlan(room: Room = demoRoom, needs: Needs = exampleNeeds): PlanResult {
  return { options: [plan(ROUNDS_A, room, needs), plan(ROUNDS_B, room, needs)], usage: emptyUsage() };
}

const sameOpening = (a: Opening, b: Opening) =>
  a.kind === b.kind &&
  a.wall === b.wall &&
  a.swing === b.swing &&
  a.hinge === b.hinge &&
  a.width.value === b.width.value &&
  a.offset.value === b.offset.value;

const itemsKey = (n: Needs) =>
  n.items
    .map((i) => `${i.itemId}:${i.quantity}`)
    .sort()
    .join(",");

/** The prepared layouts only make sense for the example room and the example furniture. */
export function exampleApplies(room: Room, needs: Needs): boolean {
  return (
    room.width.value === demoRoom.width.value &&
    room.depth.value === demoRoom.depth.value &&
    room.openings.length === demoRoom.openings.length &&
    room.openings.every((o, i) => sameOpening(o, demoRoom.openings[i])) &&
    itemsKey(needs) === itemsKey(exampleNeeds)
  );
}
