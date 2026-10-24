"use client";

import { useState } from "react";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { catalogById } from "@/data/catalog";
import { demoRoom } from "@/data/demo";
import type { PlannedLayout, PlanResult } from "@/lib/ai/planner";
import type { Needs, Placement, Room } from "@/lib/schema";
import { isAiOffline, postJson } from "./api";
import { autoPlace } from "./autoPlace";
import { EXAMPLE_NEEDS_TEXT, exampleApplies, examplePlan } from "./example";
import { NeedsStep } from "./NeedsStep";
import { PlansStep, type PlanState } from "./PlansStep";
import { RoomStep } from "./RoomStep";
import { StartStep } from "./StartStep";
import { StepHeading } from "./StepHeading";
import { Stepper, type Step } from "./Stepper";
import { linkButton } from "./styles";

interface Tour {
  name: string;
  placements: Placement[];
  status: "fits" | "doesnt_fit" | "manual";
}

/** The main flow (T-303): room, confirm, needs, two checked layouts, then the editor and 3D tour. */
export function FlowApp() {
  const [step, setStep] = useState<Step>("start");
  const [moved, setMoved] = useState(false);
  const [room, setRoom] = useState<Room>(demoRoom);
  const [needs, setNeeds] = useState<Needs>({ text: "", items: [], clearances: [] });
  const [plan, setPlan] = useState<PlanState>({ kind: "loading" });
  const [tour, setTour] = useState<Tour | null>(null);
  const [tourKey, setTourKey] = useState(0);

  const go = (next: Step) => {
    setStep(next);
    setMoved(true);
    window.scrollTo({ top: 0 });
  };

  async function requestPlan(n: Needs) {
    setPlan({ kind: "loading" });
    const res = await postJson<PlanResult>("/api/plan", { room, needs: n });
    setPlan(
      res.ok
        ? { kind: "ready", result: res.data, source: "ai" }
        : { kind: "error", message: res.error, offline: isAiOffline(res) },
    );
  }

  function openTour(t: Tour) {
    setTour(t);
    setTourKey((k) => k + 1);
    go("tour");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-stone-200 bg-white px-4 py-3 lg:px-8">
        <Stepper current={step} />
      </div>

      {step === "tour" && tour ? (
        <div className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 lg:px-8 print:hidden">
            <div className="flex flex-col gap-1">
              <StepHeading focusOnMount={moved}>{tour.name}</StepHeading>
              <p className="text-sm text-stone-700">
                {tour.status === "manual"
                  ? "Starting positions only. Move things where you want; every check runs as you go."
                  : "Move anything you like. Every check runs again as you go. Switch to the 3D room to walk through it."}
              </p>
            </div>
            <button type="button" className={linkButton} onClick={() => go(plan.kind === "ready" ? "plans" : "needs")}>
              {plan.kind === "ready" ? "Back to the two layouts" : "Back to your needs"}
            </button>
          </div>
          <EditorWorkspace
            key={tourKey}
            initial={{ room, placements: tour.placements, clearances: needs.clearances, selectedId: null }}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          {step === "start" && (
            <StartStep
              focus={moved}
              onPick={(r) => {
                setRoom(r);
                setNeeds({ text: r.id === demoRoom.id ? EXAMPLE_NEEDS_TEXT : "", items: [], clearances: [] });
                go("room");
              }}
            />
          )}
          {step === "room" && (
            <RoomStep
              initial={room}
              focus={moved}
              onBack={() => go("start")}
              onConfirm={(r) => {
                setRoom(r);
                go("needs");
              }}
            />
          )}
          {step === "needs" && (
            <NeedsStep
              initial={needs}
              focus={moved}
              onBack={() => go("room")}
              onSubmit={(n) => {
                setNeeds(n);
                go("plans");
                void requestPlan(n);
              }}
            />
          )}
          {step === "plans" && (
            <PlansStep
              state={plan}
              room={room}
              needs={needs}
              focus={moved}
              onBack={() => go("needs")}
              onRetry={() => void requestPlan(needs)}
              onUseExample={
                exampleApplies(room, needs) ? () => setPlan({ kind: "ready", result: examplePlan(room, needs), source: "example" }) : undefined
              }
              onArrangeMyself={() =>
                openTour({ name: "Your arrangement", placements: autoPlace(room, needs, catalogById, needs.clearances), status: "manual" })
              }
              onPick={(o: PlannedLayout) => openTour({ name: o.layout.name, placements: o.layout.placements, status: o.status })}
            />
          )}
        </div>
      )}
    </div>
  );
}
