"use client";

import { useId } from "react";
import type { Measure, Opening, Room, Wall } from "@/lib/schema";
import { feetInches } from "./format";
import type { Dimension, EditorAction, OpeningField } from "./useRoomEditor";

const WALLS: Wall[] = ["north", "east", "south", "west"];

export function SourceBadge({ source }: { source: Measure["source"] }) {
  return source === "estimated" ? (
    <span className="rounded-full border border-dashed border-amber-600 px-2 py-0.5 text-xs font-medium text-amber-800">
      Estimated
    </span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Confirmed</span>
  );
}

function MeasureInput({
  label,
  measure,
  onChange,
  min = 1,
}: {
  label: string;
  measure: Measure;
  onChange: (value: number) => void;
  min?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-stone-800">
          {label}
        </label>
        <SourceBadge source={measure.source} />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={0.5}
          value={measure.value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= min) onChange(v);
          }}
          className={`w-24 rounded-md border bg-white px-2 py-1.5 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 ${
            measure.source === "estimated" ? "border-dashed border-amber-600" : "border-stone-300"
          }`}
        />
        <span className="text-sm text-stone-600">in · {feetInches(measure.value)}</span>
      </div>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-stone-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm capitalize text-stone-900 focus-visible:outline-2 focus-visible:outline-amber-600"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function OpeningRow({ opening, dispatch }: { opening: Opening; dispatch: React.Dispatch<EditorAction> }) {
  const setMeasure = (field: OpeningField) => (value: number) =>
    dispatch({ type: "setOpeningMeasure", id: opening.id, field, value });
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium capitalize text-stone-900">
          {opening.kind} · {opening.wall} wall
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: "removeOpening", id: opening.id })}
          className="rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-amber-600"
          aria-label={`Remove ${opening.kind} on the ${opening.wall} wall`}
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Wall"
          value={opening.wall}
          options={WALLS}
          onChange={(wall) => dispatch({ type: "patchOpening", id: opening.id, patch: { wall } })}
        />
        {opening.kind === "door" && (
          <Select
            label="Swings"
            value={opening.swing}
            options={["in", "out"] as const}
            onChange={(swing) => dispatch({ type: "patchOpening", id: opening.id, patch: { swing } })}
          />
        )}
        {opening.kind === "door" && opening.swing === "in" && (
          <Select
            label="Hinge side"
            value={opening.hinge}
            options={["start", "end"] as const}
            onChange={(hinge) => dispatch({ type: "patchOpening", id: opening.id, patch: { hinge } })}
          />
        )}
      </div>
      <MeasureInput label="Distance from corner" measure={opening.offset} onChange={setMeasure("offset")} min={0} />
      <MeasureInput label="Width" measure={opening.width} onChange={setMeasure("width")} />
    </li>
  );
}

/** Room dimensions and openings. Estimated values stay visibly marked until the user confirms them. */
export function RoomForm({ room, dispatch }: { room: Room; dispatch: React.Dispatch<EditorAction> }) {
  const set = (dimension: Dimension) => (value: number) => dispatch({ type: "setDimension", dimension, value });
  const anyEstimated =
    [room.width, room.depth, room.height].some((m) => m.source === "estimated") ||
    room.openings.some((o) => o.offset.source === "estimated" || o.width.source === "estimated");

  return (
    <section aria-labelledby="room-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="room-heading" className="text-lg font-semibold text-stone-900">
          Room
        </h2>
        {anyEstimated && (
          <button
            type="button"
            onClick={() => dispatch({ type: "confirmAll" })}
            className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            These look right
          </button>
        )}
      </div>
      {room.dimensionsNote && <p className="text-sm text-stone-600">{room.dimensionsNote}</p>}
      <p className="text-sm text-stone-600">
        Fit checks use these numbers. Corners are measured from the north-west corner: along the north and south walls
        from the west, along the east and west walls from the north.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <MeasureInput label="Width (west to east)" measure={room.width} onChange={set("width")} />
        <MeasureInput label="Depth (north to south)" measure={room.depth} onChange={set("depth")} />
        <MeasureInput label="Ceiling height" measure={room.height} onChange={set("height")} />
      </div>
      <h3 className="text-base font-semibold text-stone-900">Doors and windows</h3>
      <ul className="flex flex-col gap-3">
        {room.openings.map((o) => (
          <OpeningRow key={o.id} opening={o} dispatch={dispatch} />
        ))}
      </ul>
      <div className="flex gap-2">
        {(["door", "window"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => dispatch({ type: "addOpening", kind })}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-amber-600"
          >
            Add {kind}
          </button>
        ))}
      </div>
    </section>
  );
}
