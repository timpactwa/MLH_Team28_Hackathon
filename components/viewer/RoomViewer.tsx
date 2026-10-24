"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import * as THREE from "three";
import { catalogById } from "@/data/catalog";
import { footprint, span } from "@/lib/geometry";
import type { Category, Placement, Room, Wall } from "@/lib/schema";
import { IN, Walker, type Pose } from "./walker";

const WALL_T = 4;
const DOOR_HEAD = 80;
const WINDOW_SILL = 30;
const WINDOW_HEAD = 80;

const CATEGORY_COLOR: Record<Category, string> = {
  bed: "#c9b8a6",
  seating: "#7c8f7a",
  table: "#a47551",
  desk: "#8b6b4a",
  chair: "#5d6b75",
  storage: "#d8cfc4",
};

interface Props {
  room: Room;
  placements: Placement[];
  violating: Set<string>;
}

/** A wall piece in wall-local coordinates: [a0, a1] along the wall, [h0, h1] in height. */
interface Piece {
  a0: number;
  a1: number;
  h0: number;
  h1: number;
}

function wallPieces(room: Room, wall: Wall): Piece[] {
  const len = wall === "north" || wall === "south" ? room.width.value : room.depth.value;
  const H = room.height.value;
  const openings = room.openings.filter((o) => o.wall === wall).sort((a, b) => a.offset.value - b.offset.value);
  const pieces: Piece[] = [];
  let cursor = -WALL_T;
  for (const o of openings) {
    const [s, e] = span(o);
    if (s > cursor) pieces.push({ a0: cursor, a1: s, h0: 0, h1: H });
    if (o.kind === "door") {
      pieces.push({ a0: s, a1: e, h0: Math.min(DOOR_HEAD, H), h1: H });
    } else {
      pieces.push({ a0: s, a1: e, h0: 0, h1: WINDOW_SILL });
      pieces.push({ a0: s, a1: e, h0: Math.min(WINDOW_HEAD, H), h1: H });
    }
    cursor = Math.max(cursor, e);
  }
  if (cursor < len + WALL_T) pieces.push({ a0: cursor, a1: len + WALL_T, h0: 0, h1: H });
  return pieces.filter((p) => p.a1 - p.a0 > 0.01 && p.h1 - p.h0 > 0.01);
}

/** World-space box (center and size, meters) for a wall piece. */
function pieceBox(room: Room, wall: Wall, p: Piece): { pos: [number, number, number]; size: [number, number, number] } {
  const W = room.width.value;
  const D = room.depth.value;
  const along = (p.a0 + p.a1) / 2;
  const len = p.a1 - p.a0;
  const y = ((p.h0 + p.h1) / 2) * IN;
  const h = (p.h1 - p.h0) * IN;
  switch (wall) {
    case "north":
      return { pos: [along * IN, y, (-WALL_T / 2) * IN], size: [len * IN, h, WALL_T * IN] };
    case "south":
      return { pos: [along * IN, y, (D + WALL_T / 2) * IN], size: [len * IN, h, WALL_T * IN] };
    case "west":
      return { pos: [(-WALL_T / 2) * IN, y, along * IN], size: [WALL_T * IN, h, len * IN] };
    case "east":
      return { pos: [(W + WALL_T / 2) * IN, y, along * IN], size: [WALL_T * IN, h, len * IN] };
  }
}

function Walls({ room }: { room: Room }) {
  const walls: Wall[] = ["north", "east", "south", "west"];
  return (
    <group>
      {walls.flatMap((wall) =>
        wallPieces(room, wall).map((p, i) => {
          const b = pieceBox(room, wall, p);
          return (
            <mesh key={`${wall}-${i}`} position={b.pos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial color="#f3efe8" />
            </mesh>
          );
        }),
      )}
      {room.openings
        .filter((o) => o.kind === "window")
        .map((o) => {
          const [s, e] = span(o);
          const b = pieceBox(room, o.wall, { a0: s, a1: e, h0: WINDOW_SILL, h1: Math.min(WINDOW_HEAD, room.height.value) });
          return (
            <mesh key={o.id} position={b.pos}>
              <boxGeometry args={[b.size[0] * (o.wall === "east" || o.wall === "west" ? 0.2 : 1), b.size[1], b.size[2] * (o.wall === "north" || o.wall === "south" ? 0.2 : 1)]} />
              <meshStandardMaterial color="#bfe3f5" transparent opacity={0.35} />
            </mesh>
          );
        })}
    </group>
  );
}

function Furniture({ placements, violating }: { placements: Placement[]; violating: Set<string> }) {
  return (
    <group>
      {placements.map((p) => {
        const item = catalogById.get(p.itemId);
        if (!item) return null;
        const r = footprint(p, item);
        const bad = violating.has(p.id);
        return (
          <mesh
            key={p.id}
            position={[p.x * IN, (item.height / 2) * IN, p.y * IN]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[(r.maxX - r.minX) * IN, item.height * IN, (r.maxY - r.minY) * IN]} />
            <meshStandardMaterial
              color={bad ? "#ef4444" : CATEGORY_COLOR[item.category]}
              emissive={bad ? "#7f1d1d" : "#000000"}
              emissiveIntensity={bad ? 0.35 : 0}
              roughness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Start just inside the first door, facing the middle of the room. */
function startPose(room: Room): Pose {
  const W = room.width.value;
  const D = room.depth.value;
  const door = room.openings.find((o) => o.kind === "door");
  let x = W / 2;
  let z = D - 24;
  if (door) {
    const [s, e] = span(door);
    const mid = (s + e) / 2;
    const step = 24;
    ({ x, z } = {
      south: { x: mid, z: D - step },
      north: { x: mid, z: step },
      west: { x: step, z: mid },
      east: { x: W - step, z: mid },
    }[door.wall]);
  }
  // Forward is (-sin yaw, -cos yaw), so this yaw looks at the room's center.
  const yaw = Math.atan2(-(W / 2 - x), -(D / 2 - z));
  return { x: x * IN, z: z * IN, yaw };
}

function WalkController({ room, walker, reducedMotion }: { room: Room; walker: Walker; reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    walker.reset(startPose(room), room.width.value * IN, room.depth.value * IN);
  }, [walker, room]);
  useFrame((_, dt) => walker.update(dt, camera, reducedMotion));
  return null;
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** 3D room built from the confirmed geometry, at true scale. Overview orbit or first-person walk. */
export default function RoomViewer({ room, placements, violating }: Props) {
  const [mode, setMode] = useState<"overview" | "walk">("overview");
  const reducedMotion = usePrefersReducedMotion();
  const [walker] = useState(() => new Walker());
  const dragging = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const W = room.width.value * IN;
  const D = room.depth.value * IN;
  const center = useMemo(() => new THREE.Vector3(W / 2, 0, D / 2), [W, D]);
  const span3 = Math.max(W, D);

  function onKeyDown(e: KeyboardEvent) {
    if (mode === "walk" && walker.keyDown(e.key)) e.preventDefault();
  }
  function onKeyUp(e: KeyboardEvent) {
    walker.keyUp(e.key);
  }
  function onPointerDown(e: PointerEvent) {
    if (mode !== "walk") return;
    dragging.current = { x: e.clientX, y: e.clientY, moved: false };
  }
  function onPointerMove(e: PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    walker.look(dx, dy);
    d.x = e.clientX;
    d.y = e.clientY;
  }
  function onFloorClick(e: ThreeEvent<MouseEvent>) {
    if (mode !== "walk" || dragging.current?.moved) return;
    walker.walkTo(e.point.x, e.point.z);
  }

  const button =
    "rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-stone-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-amber-600";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg bg-stone-200 focus-visible:outline-2 focus-visible:outline-amber-600"
      tabIndex={0}
      role="region"
      aria-label={
        mode === "walk"
          ? "3D walkthrough. W and S or the up and down arrows move, A and D step sideways, left and right arrows turn. Drag to look. Click the floor to walk there."
          : "3D overview of the room. Drag to orbit, scroll to zoom."
      }
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => walker.releaseAll()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setTimeout(() => (dragging.current = null), 0)}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [W / 2, span3 * 2, D + span3 * 0.8], fov: mode === "walk" ? 75 : 50, near: 0.05, far: 100 }}
        key={mode}
      >
        <color attach="background" args={["#e7e2da"]} />
        <hemisphereLight args={["#ffffff", "#b9a88f", 1.1]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[W * 0.7, 5, D * 0.3]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, D / 2]} receiveShadow onClick={onFloorClick}>
          <planeGeometry args={[W, D]} />
          <meshStandardMaterial color="#d9c7ad" roughness={0.9} />
        </mesh>
        <Walls room={room} />
        <Furniture placements={placements} violating={violating} />
        {mode === "overview" ? (
          <OrbitControls target={center} maxPolarAngle={Math.PI / 2.1} enableDamping={!reducedMotion} />
        ) : (
          <WalkController room={room} walker={walker} reducedMotion={reducedMotion} />
        )}
      </Canvas>

      <div className="absolute left-3 top-3 flex gap-2">
        <button type="button" className={button} aria-pressed={mode === "overview"} onClick={() => setMode("overview")}>
          Overview
        </button>
        <button type="button" className={button} aria-pressed={mode === "walk"} onClick={() => setMode("walk")}>
          Walk through
        </button>
      </div>

      {mode === "walk" && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Walk controls">
          <button type="button" className={button} onClick={() => walker.turn(1)} aria-label="Turn left">
            ↺ Left
          </button>
          <button type="button" className={button} onClick={() => walker.step(1)} aria-label="Step forward">
            ↑ Forward
          </button>
          <button type="button" className={button} onClick={() => walker.step(-1)} aria-label="Step back">
            ↓ Back
          </button>
          <button type="button" className={button} onClick={() => walker.turn(-1)} aria-label="Turn right">
            Right ↻
          </button>
        </div>
      )}
    </div>
  );
}
