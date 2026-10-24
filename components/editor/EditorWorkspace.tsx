"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LayoutSummary } from "@/components/summary/LayoutSummary";
import { demoLayout, demoRoom } from "@/data/demo";
import { FurniturePanel } from "./FurniturePanel";
import { PlanView } from "./PlanView";
import { RoomForm } from "./RoomForm";
import { useRoomEditor, violatingIds, type EditorState } from "./useRoomEditor";

const RoomViewer = dynamic(() => import("@/components/viewer/RoomViewer"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-stone-600">Loading 3D view…</div>,
});

type View = "plan" | "3d";

const DEMO_START: EditorState = { room: demoRoom, placements: demoLayout.placements, clearances: [], selectedId: null };

/**
 * Room editor with a live-checked 2D plan, a 3D view of the same model (T-301, T-302),
 * and the text summary below it (T-305). `initial` is read once, on mount.
 */
export function EditorWorkspace({ initial = DEMO_START }: { initial?: EditorState }) {
  const [state, dispatch, result] = useRoomEditor(initial);
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
    <div className="flex flex-1 flex-col">
      <a
        href="#layout-summary"
        className="sr-only focus:not-sr-only focus:m-2 focus:self-start focus:rounded-md focus:bg-stone-900 focus:px-3 focus:py-2 focus:text-white print:hidden"
      >
        Skip to the text summary
      </a>
      <div className="grid flex-1 grid-cols-1 gap-6 p-4 lg:grid-cols-[320px_1fr_320px] lg:p-6 print:hidden">
        <aside className="order-2 lg:order-1" aria-label="Room measurements">
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

        <aside className="order-3" aria-label="Furniture and space">
          <FurniturePanel
            placements={state.placements}
            clearances={state.clearances}
            result={result}
            selectedId={state.selectedId}
            dispatch={dispatch}
          />
        </aside>
      </div>
      <div className="border-t border-stone-200 bg-white p-4 lg:p-6 print:border-0 print:p-0">
        <div className="mx-auto max-w-4xl">
          <LayoutSummary room={state.room} placements={state.placements} clearances={state.clearances} result={result} />
        </div>
      </div>
    </div>
  );
}
