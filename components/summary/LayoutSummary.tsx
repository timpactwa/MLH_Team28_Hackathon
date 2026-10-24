"use client";

import { SourceBadge } from "@/components/editor/RoomForm";
import { feetInches } from "@/components/editor/format";
import { catalogById } from "@/data/catalog";
import { footprint } from "@/lib/geometry";
import type { CheckResult, ClearanceRequirement, Measure, Placement, Room } from "@/lib/schema";
import { offsetsPhrase, openingPhrase, orientationPhrase, positionPhrase } from "./describe";

interface Props {
  room: Room;
  placements: Placement[];
  clearances: ClearanceRequirement[];
  result: CheckResult;
  /** Lets a skip link target the summary. */
  id?: string;
}

function measureText(label: string, m: Measure) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <dt className="min-w-16 font-medium text-stone-800">{label}</dt>
      <dd className="flex items-center gap-2 text-stone-900">
        {feetInches(m.value)} ({m.value} in) <SourceBadge source={m.source} />
      </dd>
    </div>
  );
}

/**
 * The layout as text, for screen readers, keyboard users, and print (T-305).
 * Everything here comes from the room model and the deterministic checker, never from the model.
 */
export function LayoutSummary({ room, placements, clearances, result, id = "layout-summary" }: Props) {
  const measures = [room.width, room.depth, room.height, ...room.openings.flatMap((o) => [o.offset, o.width])];
  const estimated = measures.filter((m) => m.source === "estimated").length;
  const turning = clearances.find((c) => c.kind === "turning_circle");
  const doorClear = clearances.find((c) => c.kind === "door_clearance");
  const problemsFor = (pid: string) => result.violations.filter((v) => v.items.includes(pid)).map((v) => v.message);

  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="flex flex-col gap-5 text-sm text-stone-800">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`${id}-heading`} className="text-lg font-semibold text-stone-900">
          Text summary of this layout
        </h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 print:hidden"
        >
          Print summary
        </button>
      </div>

      <p className={`rounded-md border p-3 font-medium ${result.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
        {result.ok
          ? `This layout passes every check against the room model below${estimated ? ", but some of that model is still estimated" : ""}.`
          : `This layout has ${result.violations.length} problem${result.violations.length === 1 ? "" : "s"}: ${result.violations.map((v) => v.message).join(" ")}`}
      </p>

      <div>
        <h3 className="mb-2 font-semibold text-stone-900">The room</h3>
        {room.dimensionsNote && <p className="mb-2 text-stone-700">{room.dimensionsNote}</p>}
        <dl className="flex flex-col gap-1.5">
          {measureText("Width", room.width)}
          {measureText("Depth", room.depth)}
          {measureText("Ceiling", room.height)}
        </dl>
        <p className="mt-2 text-stone-700">
          {estimated
            ? `${estimated} of ${measures.length} measurements are estimated. Measure them before you rely on this.`
            : "Every measurement is confirmed by you."}
        </p>
        {room.openings.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {room.openings.map((o) => (
              <li key={o.id}>{openingPhrase(o)}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-stone-900">Space you asked for</h3>
        <ul className="list-disc space-y-1 pl-5">
          {turning?.kind === "turning_circle" && (
            <li>
              {result.turningCircle
                ? `A clear ${feetInches(turning.diameter)} turning circle fits, centered ${feetInches(result.turningCircle.x)} from the west wall and ${feetInches(result.turningCircle.y)} from the north wall.`
                : `There is no clear ${feetInches(turning.diameter)} turning circle anywhere on the floor.`}
            </li>
          )}
          {doorClear?.kind === "door_clearance" && (
            <li>
              {result.violations.some((v) => v.code === "door_clearance")
                ? `Something sits in the ${feetInches(doorClear.depth)} of clear floor inside a door.`
                : `${feetInches(doorClear.depth)} of floor inside every door is clear.`}
            </li>
          )}
          {!turning && !doorClear && <li>No extra clear space was requested.</li>}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-stone-900">Furniture</h3>
        {placements.length === 0 ? (
          <p>No furniture placed.</p>
        ) : (
          <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-amber-600" tabIndex={0} role="region" aria-label="Furniture table, scrolls sideways">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">Each piece of furniture, its size, where it sits, and any problems</caption>
              <thead>
                <tr className="border-b border-stone-300">
                  <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Size</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Where</th>
                  <th scope="col" className="py-2 font-semibold">Check</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => {
                  const item = catalogById.get(p.itemId);
                  if (!item) return null;
                  const r = footprint(p, item);
                  const problems = problemsFor(p.id);
                  return (
                    <tr key={p.id} className="border-b border-stone-200 align-top">
                      <th scope="row" className="py-2 pr-3 font-medium text-stone-900">{item.name}</th>
                      <td className="py-2 pr-3">
                        {feetInches(item.width)} by {feetInches(item.depth)}
                      </td>
                      <td className="py-2 pr-3">
                        {positionPhrase(room, r)}. {offsetsPhrase(r)}. {orientationPhrase(p, item)}.
                      </td>
                      <td className={`py-2 ${problems.length ? "text-red-800" : "text-emerald-800"}`}>
                        {problems.length ? problems.join(" ") : "OK"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-stone-900">What this does not tell you</h3>
        <ul className="list-disc space-y-1 pl-5 text-stone-700">
          <li>It checks footprints against the room model above, not the real apartment. It does not certify accessibility or building-code compliance.</li>
          <li>The turning circle is checked for floor space only, not for a clear path to it from the door.</li>
          <li>Furniture sizes are typical retail sizes. Measure your own pieces.</li>
          <li>Generated photos and 3D worlds are design concepts, not to scale.</li>
        </ul>
      </div>
    </section>
  );
}
