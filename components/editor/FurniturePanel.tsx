"use client";

import { useId, useState } from "react";
import { catalog, catalogById } from "@/data/catalog";
import type { CheckResult, ClearanceRequirement, Placement } from "@/lib/schema";
import { feetInches } from "./format";
import type { EditorAction } from "./useRoomEditor";

/** A 60 in diameter turning space is the ADA 2010 Standards figure (section 304.3.1). */
export const TURNING: ClearanceRequirement = { kind: "turning_circle", diameter: 60 };
export const DOOR_CLEAR: ClearanceRequirement = { kind: "door_clearance", depth: 48 };

/** Same-category items that are smaller than this one, smallest footprint last. */
function smallerOptions(itemId: string) {
  const item = catalogById.get(itemId);
  if (!item) return [];
  return catalog
    .filter((c) => c.category === item.category && c.id !== item.id && c.width * c.depth < item.width * item.depth)
    .sort((a, b) => b.width * b.depth - a.width * a.depth);
}

interface Props {
  placements: Placement[];
  clearances: ClearanceRequirement[];
  result: CheckResult;
  selectedId: string | null;
  dispatch: React.Dispatch<EditorAction>;
}

export function FurniturePanel({ placements, clearances, result, selectedId, dispatch }: Props) {
  const addId = useId();
  const [toAdd, setToAdd] = useState(catalog[0].id);
  const has = (kind: ClearanceRequirement["kind"]) => clearances.some((c) => c.kind === kind);

  return (
    <section aria-labelledby="furniture-heading" className="flex flex-col gap-4">
      <h2 id="furniture-heading" className="text-lg font-semibold text-stone-900">
        Furniture and space
      </h2>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium text-stone-800">Space I need</legend>
        <label className="flex items-start gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-emerald-700"
            checked={has("turning_circle")}
            onChange={() => dispatch({ type: "toggleClearance", requirement: TURNING })}
          />
          <span>
            A clear 5 ft (60 in) circle for turning a wheelchair
            <span className="block text-xs text-stone-600">The ADA turning-space size. This checks the floor, not a route to it.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-sky-700"
            checked={has("door_clearance")}
            onChange={() => dispatch({ type: "toggleClearance", requirement: DOOR_CLEAR })}
          />
          <span>4 ft (48 in) of clear floor inside each door</span>
        </label>
      </fieldset>

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={addId} className="text-sm font-medium text-stone-800">
            Add furniture
          </label>
          <select
            id={addId}
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-amber-600"
          >
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.width} x {c.depth} in)
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "addPlacement", itemId: toAdd })}
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Add
        </button>
      </div>

      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {result.ok ? (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            Everything passes the checks against the room you confirmed.
          </p>
        ) : (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">
              {result.violations.length} problem{result.violations.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {result.violations.map((v, i) => (
                <li key={i}>{v.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2" aria-label="Placed furniture">
        {placements.map((p) => {
          const item = catalogById.get(p.itemId);
          if (!item) return null;
          const problems = result.violations.filter((v) => v.items.includes(p.id));
          const smaller = problems.length ? smallerOptions(p.itemId) : [];
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                problems.length ? "border-red-300 bg-red-50/50" : "border-stone-200 bg-white"
              } ${selectedId === p.id ? "ring-2 ring-amber-500" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "select", id: p.id })}
                  className="text-left text-sm font-medium text-stone-900 hover:underline focus-visible:outline-2 focus-visible:outline-amber-600"
                >
                  {item.name}
                  <span className="block text-xs font-normal text-stone-600">
                    {feetInches(item.width)} x {feetInches(item.depth)}
                  </span>
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "rotatePlacement", id: p.id })}
                    aria-label={`Rotate ${item.name}`}
                    className="rounded px-2 py-1 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-amber-600"
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "removePlacement", id: p.id })}
                    aria-label={`Remove ${item.name}`}
                    className="rounded px-2 py-1 text-sm text-stone-700 hover:bg-stone-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-amber-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {smaller.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-xs text-stone-700">
                  Try smaller:
                  {smaller.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => dispatch({ type: "swapItem", id: p.id, itemId: s.id })}
                      className="rounded-full border border-stone-300 bg-white px-2 py-0.5 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-amber-600"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
