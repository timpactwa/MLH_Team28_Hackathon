"use client";

import { useMemo, useReducer } from "react";
import { catalogById } from "@/data/catalog";
import { checkLayout, nearestFit } from "@/lib/geometry";
import type { CheckResult, ClearanceRequirement, Opening, Placement, Room, Rotation } from "@/lib/schema";

export type Dimension = "width" | "depth" | "height";
export type OpeningField = "offset" | "width";

export interface EditorState {
  room: Room;
  placements: Placement[];
  clearances: ClearanceRequirement[];
  selectedId: string | null;
}

export type EditorAction =
  | { type: "setDimension"; dimension: Dimension; value: number }
  | { type: "confirmAll" }
  | { type: "setOpeningMeasure"; id: string; field: OpeningField; value: number }
  | { type: "patchOpening"; id: string; patch: Partial<Pick<Opening, "wall" | "swing" | "hinge" | "kind">> }
  | { type: "addOpening"; kind: Opening["kind"] }
  | { type: "removeOpening"; id: string }
  | { type: "movePlacement"; id: string; x: number; y: number }
  | { type: "nudgePlacement"; id: string; dx: number; dy: number }
  | { type: "rotatePlacement"; id: string }
  | { type: "addPlacement"; itemId: string }
  | { type: "removePlacement"; id: string }
  | { type: "swapItem"; id: string; itemId: string }
  | { type: "setLayout"; placements: Placement[] }
  | { type: "toggleClearance"; requirement: ClearanceRequirement }
  | { type: "select"; id: string | null };

const confirmed = (value: number) => ({ value, source: "confirmed" as const });

function patchOpening(room: Room, id: string, f: (o: Opening) => Opening): Room {
  return { ...room, openings: room.openings.map((o) => (o.id === id ? f(o) : o)) };
}

function patchPlacement(placements: Placement[], id: string, f: (p: Placement) => Placement): Placement[] {
  return placements.map((p) => (p.id === id ? f(p) : p));
}

function nextId(prefix: string, taken: { id: string }[]): string {
  let n = 1;
  while (taken.some((t) => t.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

const snap = (n: number) => Math.round(n);

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { room, placements } = state;
  switch (action.type) {
    case "setDimension":
      return { ...state, room: { ...room, [action.dimension]: confirmed(action.value) } };
    case "confirmAll":
      return {
        ...state,
        room: {
          ...room,
          width: confirmed(room.width.value),
          depth: confirmed(room.depth.value),
          height: confirmed(room.height.value),
          openings: room.openings.map((o) => ({ ...o, offset: confirmed(o.offset.value), width: confirmed(o.width.value) })),
        },
      };
    case "setOpeningMeasure":
      return { ...state, room: patchOpening(room, action.id, (o) => ({ ...o, [action.field]: confirmed(action.value) })) };
    case "patchOpening":
      return {
        ...state,
        room: patchOpening(room, action.id, (o) => {
          const next = { ...o, ...action.patch };
          if (next.kind === "window") next.swing = "none";
          if (next.kind === "door" && o.kind === "window") next.swing = "in";
          return next;
        }),
      };
    case "addOpening": {
      const id = nextId(action.kind, room.openings);
      const opening: Opening = {
        id,
        kind: action.kind,
        wall: "west",
        offset: confirmed(24),
        width: confirmed(action.kind === "door" ? 32 : 36),
        swing: action.kind === "door" ? "in" : "none",
        hinge: "start",
      };
      return { ...state, room: { ...room, openings: [...room.openings, opening] } };
    }
    case "removeOpening":
      return { ...state, room: { ...room, openings: room.openings.filter((o) => o.id !== action.id) } };
    case "movePlacement":
      return { ...state, placements: patchPlacement(placements, action.id, (p) => ({ ...p, x: snap(action.x), y: snap(action.y) })) };
    case "nudgePlacement":
      return {
        ...state,
        placements: patchPlacement(placements, action.id, (p) => ({ ...p, x: p.x + action.dx, y: p.y + action.dy })),
      };
    case "rotatePlacement":
      return {
        ...state,
        placements: patchPlacement(placements, action.id, (p) => ({ ...p, rotation: ((p.rotation + 90) % 360) as Rotation })),
      };
    case "addPlacement": {
      const id = nextId(action.itemId, placements);
      const p: Placement = { id, itemId: action.itemId, x: room.width.value / 2, y: room.depth.value / 2, rotation: 0 };
      return { ...state, placements: [...placements, p], selectedId: id };
    }
    case "removePlacement":
      return {
        ...state,
        placements: placements.filter((p) => p.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case "swapItem": {
      // Swap, then slide the new item to the nearest spot where it has no problems of its own, if there is one.
      const swapped = patchPlacement(placements, action.id, (p) => ({ ...p, itemId: action.itemId }));
      const spot = nearestFit({ room, placements: swapped, catalog: catalogById, clearances: state.clearances }, action.id);
      return { ...state, placements: spot ? patchPlacement(swapped, action.id, (p) => ({ ...p, ...spot })) : swapped };
    }
    case "setLayout":
      return { ...state, placements: action.placements, selectedId: null };
    case "toggleClearance": {
      const has = state.clearances.some((c) => c.kind === action.requirement.kind);
      return {
        ...state,
        clearances: has
          ? state.clearances.filter((c) => c.kind !== action.requirement.kind)
          : [...state.clearances, action.requirement],
      };
    }
    case "select":
      return { ...state, selectedId: action.id };
  }
}

/** Editor state plus the live check result, recomputed on every change. */
export function useRoomEditor(initial: EditorState): [EditorState, React.Dispatch<EditorAction>, CheckResult] {
  const [state, dispatch] = useReducer(editorReducer, initial);
  const result = useMemo(
    () => checkLayout({ room: state.room, placements: state.placements, catalog: catalogById, clearances: state.clearances }),
    [state.room, state.placements, state.clearances],
  );
  return [state, dispatch, result];
}

/** Placement ids with at least one violation. */
export function violatingIds(result: CheckResult): Set<string> {
  return new Set(result.violations.flatMap((v) => v.items));
}
