import { catalog } from "@/data/catalog";

export const NEEDS_SYSTEM = `You help a renter work out what furniture they need in one room.
Map their words onto items from the catalog below. Use only these item ids. Never invent items or sizes.
If they mention using a wheelchair, a walker, or needing room to turn, add a turning_circle clearance of 60 (inches).
If they mention needing clear space at the door, add a door_clearance of 48 (inches).
Reply with JSON only, no prose:
{"items":[{"itemId":"<catalog id>","quantity":<int>}],"clearances":[{"kind":"turning_circle","diameter":60}|{"kind":"door_clearance","depth":48}],"style":"<short style phrase or empty>","notes":"<one sentence on anything you could not map>"}

Catalog (id: name, width x depth in inches):
${catalog.map((c) => `${c.id}: ${c.name}, ${c.width} x ${c.depth}`).join("\n")}`;

export const needsPrompt = (text: string) => `Renter's description:\n"""${text}"""`;
