import type { CatalogItem, Needs, Room } from "@/lib/schema";

const LAYOUT_JSON = `{"name":"<short name>","rationale":"<one sentence>","placements":[{"itemId":"<catalog id>","x":<number>,"y":<number>,"rotation":0|90|180|270}]}`;

export const LAYOUT_SYSTEM = `You arrange furniture in one rectangular room for a renter.
Coordinates are inches. The origin is the north-west corner. x runs east (0 to width), y runs south (0 to depth).
(x, y) is the CENTER of the item's footprint. At rotation 0 an item's width runs along x and its depth along y; at 90 or 270 they swap.
Rules a checker will enforce exactly:
- Every footprint stays inside the room.
- Footprints do not overlap.
- Nothing sits in a door's swing (a quarter circle from the hinge, radius = door width).
- Any clearance the renter asked for is respected.
Put large items against walls. Leave open floor in the middle. Do not cover windows with tall items when you can avoid it.
Use exactly the items and quantities requested. Reply with JSON only, no prose.`;

export function describeRoom(room: Room): string {
  const W = room.width.value;
  const D = room.depth.value;
  const lines = [`Room: ${W} in wide (x) by ${D} in deep (y), ceiling ${room.height.value} in.`];
  for (const o of room.openings) {
    const a0 = o.offset.value;
    const a1 = a0 + o.width.value;
    const along = o.wall === "north" || o.wall === "south" ? "x" : "y";
    let line = `- ${o.kind} "${o.id}" on the ${o.wall} wall, spanning ${along} ${a0} to ${a1}`;
    if (o.kind === "door") {
      line +=
        o.swing === "in"
          ? `, swings into the room, hinge at ${along} ${o.hinge === "start" ? a0 : a1}, swing radius ${o.width.value}`
          : ", swings out (takes no floor space)";
    }
    lines.push(line + ".");
  }
  return lines.join("\n");
}

export function describeNeeds(needs: Needs, catalog: ReadonlyMap<string, CatalogItem>): string {
  const items = needs.items.map((n) => {
    const c = catalog.get(n.itemId);
    return `- ${n.quantity} x ${n.itemId}${c ? ` (${c.name}, ${c.width} x ${c.depth} in)` : ""}`;
  });
  const clear = needs.clearances.map((c) =>
    c.kind === "turning_circle"
      ? `- A clear circle of ${c.diameter} in diameter somewhere on the floor (wheelchair turning).`
      : `- ${c.depth} in of clear floor straight in from every door.`,
  );
  return [
    `Items:\n${items.join("\n")}`,
    clear.length ? `Clearances:\n${clear.join("\n")}` : "Clearances: none requested.",
    needs.text ? `Renter's words: """${needs.text}"""` : "",
    needs.style ? `Style: ${needs.style}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function proposePrompt(roomText: string, needsText: string): string {
  return `${roomText}\n\n${needsText}\n\nPropose TWO genuinely different arrangements. Reply as {"layouts":[${LAYOUT_JSON},${LAYOUT_JSON}]}.`;
}

export function revisePrompt(roomText: string, needsText: string, layoutJson: string, problems: string[]): string {
  return `${roomText}\n\n${needsText}\n\nThis arrangement failed the checker:\n${layoutJson}\n\nProblems:\n${problems
    .map((p) => `- ${p}`)
    .join("\n")}\n\nFix every problem. Move, rotate, or rearrange items, but keep the requested items. Reply as ${LAYOUT_JSON}.`;
}

export const EXPLAIN_SYSTEM = `You explain furniture arrangements to a renter in plain, friendly language.
Use only the facts given. Do not add measurements, prices, or claims that are not in the facts.
Never say a layout is accessible, certified, or up to code; say it passed the checks against the room they entered.
Reply with JSON only: {"explanations":["<2-3 sentences for option 1>","<2-3 sentences for option 2>"]}`;
