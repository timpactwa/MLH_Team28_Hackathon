"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { demoLayout, demoRoom } from "@/data/demo";
import { FurniturePanel } from "./FurniturePanel";
import { PlanView } from "./PlanView";
import { RoomForm } from "./RoomForm";
import { useRoomEditor, violatingIds } from "./useRoomEditor";

const RoomViewer = dynamic(() => import("@/components/viewer/RoomViewer"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-600">Loading 3D view…</div>,
});

type View = "plan" | "3d";

/** Room editor with a live-checked 2D plan and a 3D view of the same model (T-301, T-302). */
export function EditorWorkspace() {
  const [state, dispatch, result] = useRoomEditor({
    room: demoRoom,
    placements: demoLayout.placements,
    clearances: [],
    selectedId: null,
  });
  const [view, setView] = useState<View>("plan");

  const tab = (v: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      aria-controls="view-panel"
      onClick={() => setView(v)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-amber-600 ${
        view === v ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="grid flex-1 grid-cols-1 gap-6 p-4 lg:grid-cols-[320px_1fr_320px] lg:p-6">
      <aside className="order-2 lg:order-1">
        <RoomForm room={state.room} dispatch={dispatch} />
      </aside>

      <section className="order-1 flex min-h-[480px] flex-col gap-3 lg:order-2" aria-label="Room views">
        <div role="tablist" aria-label="View" className="flex gap-1 self-start rounded-lg bg-stone-100 p-1">
          {tab("plan", "2D plan")}
          {tab("3d", "3D room")}
        </div>
        <div id="view-panel" role="tabpanel" className="relative min-h-[420px] flex-1 rounded-lg border border-stone-200 bg-white">
          {view === "plan" ? (
            <div className="absolute inset-0 p-2">
              <PlanView
                room={state.room}
                placements={state.placements}
                clearances={state.clearances}
                result={result}
                selectedId={state.selectedId}
                dispatch={dispatch}
              />
            </div>
          ) : (
            <div className="absolute inset-0">
              <RoomViewer room={state.room} placements={state.placements} violating={violatingIds(result)} />
            </div>
          )}
        </div>
        <p className="text-xs text-stone-600">
          Checks run against the room model above, not the photo. They do not certify accessibility or building-code compliance.
        </p>
      </section>

      <aside className="order-3">
        <FurniturePanel
          placements={state.placements}
          clearances={state.clearances}
          result={result}
          selectedId={state.selectedId}
          dispatch={dispatch}
        />
      </aside>
    </div>
  );
}
