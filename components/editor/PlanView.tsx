"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { catalogById } from "@/data/catalog";
import { doorClearance, doorSwing, footprint, span, wallPoint } from "@/lib/geometry";
import type { CheckResult, ClearanceRequirement, Opening, Placement, Room } from "@/lib/schema";
import { feetInches } from "./format";
import { violatingIds, type EditorAction } from "./useRoomEditor";

const PAD = 30;
const WALL = 4;

const INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] } as const;

interface Props {
  room: Room;
  placements: Placement[];
  clearances: ClearanceRequirement[];
  result: CheckResult;
  selectedId: string | null;
  /** Omit for a read-only thumbnail: no focus, no dragging. */
  dispatch?: React.Dispatch<EditorAction>;
  /** Accessible name for a read-only plan. */
  label?: string;
}

/** Top-down plan in inches. Furniture can be dragged, or moved with the keyboard. */
export function PlanView({ room, placements, clearances, result, selectedId, dispatch, label }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gridId = useId();
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const W = room.width.value;
  const D = room.depth.value;
  const bad = violatingIds(result);
  const doorDepth = clearances.find((c) => c.kind === "door_clearance")?.depth;
  const interactive = dispatch !== undefined;

  function toRoom(e: PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function onPointerDown(e: PointerEvent<SVGGElement>, p: Placement) {
    const at = toRoom(e);
    drag.current = { id: p.id, dx: at.x - p.x, dy: at.y - p.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatch?.({ type: "select", id: p.id });
  }

  function onPointerMove(e: PointerEvent<SVGGElement>) {
    if (!drag.current) return;
    const at = toRoom(e);
    dispatch?.({ type: "movePlacement", id: drag.current.id, x: at.x - drag.current.dx, y: at.y - drag.current.dy });
  }

  function onKeyDown(e: KeyboardEvent<SVGGElement>, p: Placement) {
    if (!dispatch) return;
    const step = e.shiftKey ? 12 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      dispatch({ type: "nudgePlacement", id: p.id, dx: moves[e.key][0], dy: moves[e.key][1] });
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      dispatch({ type: "rotatePlacement", id: p.id });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      dispatch({ type: "removePlacement", id: p.id });
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${D + PAD * 2}`}
      className={`h-full w-full select-none ${interactive ? "touch-none" : ""}`}
      role={interactive ? "group" : "img"}
      aria-label={label ?? `Floor plan, ${feetInches(W)} by ${feetInches(D)}. Select an item, then use arrow keys to move it (Shift for 1 foot steps), R to rotate, Delete to remove.`}
    >
      <defs>
        <pattern id={gridId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect x={0} y={0} width={W} height={D} className="fill-stone-50" />
      <rect x={0} y={0} width={W} height={D} fill={`url(#${gridId})`} className="text-stone-900" />

      {doorDepth !== undefined &&
        room.openings
          .filter((o) => o.kind === "door")
          .map((door) => {
            const z = doorClearance(room, door, doorDepth);
            return (
              <rect
                key={`clear-${door.id}`}
                x={z.minX}
                y={z.minY}
                width={z.maxX - z.minX}
                height={z.maxY - z.minY}
                className="fill-sky-400/15 stroke-sky-500"
                strokeDasharray="3 2"
                strokeWidth={0.75}
              />
            );
          })}

      {result.turningCircle && (
        <g aria-hidden>
          <circle
            cx={result.turningCircle.x}
            cy={result.turningCircle.y}
            r={result.turningCircle.r}
            className="fill-emerald-400/15 stroke-emerald-600"
            strokeDasharray="4 3"
            strokeWidth={0.75}
          />
          <text x={result.turningCircle.x} y={result.turningCircle.y} textAnchor="middle" className="fill-emerald-800 text-[6px]">
            {feetInches(result.turningCircle.r * 2)} turning circle
          </text>
        </g>
      )}

      {/* Walls */}
      <rect
        x={-WALL / 2}
        y={-WALL / 2}
        width={W + WALL}
        height={D + WALL}
        fill="none"
        className="stroke-stone-800"
        strokeWidth={WALL}
      />

      {room.openings.map((o) => (
        <OpeningMark key={o.id} room={room} opening={o} />
      ))}

      {placements.map((p) => {
        const item = catalogById.get(p.itemId);
        if (!item) return null;
        const r = footprint(p, item);
        const isBad = bad.has(p.id);
        const isSel = selectedId === p.id;
        const problems = result.violations.filter((v) => v.items.includes(p.id)).map((v) => v.message);
        return (
          <g
            key={p.id}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isSel : undefined}
            aria-label={interactive ? `${item.name} at ${feetInches(p.x)} from the west wall, ${feetInches(p.y)} from the north wall, rotated ${p.rotation} degrees. ${problems.length ? `Problem: ${problems.join(" ")}` : "No problems."}` : undefined}
            className={interactive ? "cursor-grab outline-none active:cursor-grabbing [&:focus-visible>rect]:stroke-[2.5]" : undefined}
            onPointerDown={interactive ? (e) => onPointerDown(e, p) : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? () => (drag.current = null) : undefined}
            onFocus={interactive ? () => dispatch({ type: "select", id: p.id }) : undefined}
            onKeyDown={interactive ? (e) => onKeyDown(e, p) : undefined}
          >
            <rect
              x={r.minX}
              y={r.minY}
              width={r.maxX - r.minX}
              height={r.maxY - r.minY}
              rx={2}
              className={
                isBad
                  ? "fill-red-200 stroke-red-600"
                  : isSel
                    ? "fill-amber-100 stroke-amber-700"
                    : "fill-white stroke-stone-500"
              }
              strokeWidth={isSel ? 1.75 : 1}
              strokeDasharray={isBad ? "4 2" : undefined}
            />
            <text
              x={(r.minX + r.maxX) / 2}
              y={(r.minY + r.maxY) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`pointer-events-none text-[5.5px] ${isBad ? "fill-red-800" : "fill-stone-700"}`}
            >
              {isBad ? "⚠ " : ""}
              {item.name}
            </text>
          </g>
        );
      })}

      <DimensionLabel x={W / 2} y={-PAD / 2} text={`${feetInches(W)}${room.width.source === "estimated" ? " (est.)" : ""}`} />
      <DimensionLabel
        x={-PAD / 2}
        y={D / 2}
        rotate
        text={`${feetInches(D)}${room.depth.source === "estimated" ? " (est.)" : ""}`}
      />
    </svg>
  );
}

function DimensionLabel({ x, y, text, rotate }: { x: number; y: number; text: string; rotate?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={rotate ? `rotate(-90 ${x} ${y})` : undefined}
      className="fill-stone-500 text-[7px]"
    >
      {text}
    </text>
  );
}

function OpeningMark({ room, opening }: { room: Room; opening: Opening }) {
  const [a0, a1] = span(opening);
  const p0 = wallPoint(room, opening.wall, a0);
  const p1 = wallPoint(room, opening.wall, a1);
  const estimated = opening.offset.source === "estimated" || opening.width.source === "estimated";

  if (opening.kind === "window") {
    return (
      <line
        x1={p0.x}
        y1={p0.y}
        x2={p1.x}
        y2={p1.y}
        className="stroke-sky-500"
        strokeWidth={WALL + 1}
        strokeDasharray={estimated ? "3 2" : undefined}
      >
        <title>{`Window on the ${opening.wall} wall`}</title>
      </line>
    );
  }

  const swing = doorSwing(room, opening);
  const [ix, iy] = INWARD[opening.wall];
  return (
    <g>
      {/* Gap in the wall */}
      <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} className="stroke-stone-50" strokeWidth={WALL + 1} />
      {swing && (() => {
        const h = swing.hinge;
        const closed = h.x === p0.x && h.y === p0.y ? p1 : p0;
        const open = { x: h.x + ix * swing.r, y: h.y + iy * swing.r };
        const cross = (closed.x - h.x) * (open.y - h.y) - (closed.y - h.y) * (open.x - h.x);
        const sweep = cross > 0 ? 1 : 0;
        return (
          <g>
            <path
              d={`M ${h.x} ${h.y} L ${closed.x} ${closed.y} A ${swing.r} ${swing.r} 0 0 ${sweep} ${open.x} ${open.y} Z`}
              className="fill-amber-300/20 stroke-amber-600"
              strokeWidth={0.6}
              strokeDasharray={estimated ? "3 2" : undefined}
            />
            <line x1={h.x} y1={h.y} x2={open.x} y2={open.y} className="stroke-amber-700" strokeWidth={1.2} />
          </g>
        );
      })()}
      <title>{`Door on the ${opening.wall} wall`}</title>
    </g>
  );
}
