"use client";

import { PlanView } from "@/components/editor/PlanView";
import type { Attempt, PlannedLayout, PlanResult } from "@/lib/ai/planner";
import type { Needs, Room } from "@/lib/schema";
import { Spinner } from "./NeedsStep";
import { StepHeading } from "./StepHeading";
import { linkButton, primaryButton, secondaryButton } from "./styles";

export type PlanState =
  | { kind: "loading" }
  | { kind: "error"; message: string; offline: boolean }
  | { kind: "ready"; result: PlanResult; source: "ai" | "example" };

interface Props {
  state: PlanState;
  room: Room;
  needs: Needs;
  /** Set when the prepared example matches this room and furniture. */
  onUseExample?: () => void;
  onRetry: () => void;
  onArrangeMyself: () => void;
  onPick: (option: PlannedLayout) => void;
  onBack: () => void;
  focus: boolean;
}

/** Step 4: two layouts side by side, each with the checker's verdict and every round it took to get there. */
export function PlansStep({ state, room, needs, onUseExample, onRetry, onArrangeMyself, onPick, onBack, focus }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-3xl flex-col gap-2">
        <StepHeading focusOnMount={focus}>Two ways to lay it out</StepHeading>
        <p className="text-stone-700">
          Gemma proposes. Our checker measures every piece against your room, sends any problems back, and allows at
          most two revisions. A layout that still fails is marked as not fitting, never as passing.
        </p>
      </div>

      {state.kind === "loading" && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-6 text-stone-800">
          <Spinner />
          <span>
            Proposing two layouts and checking each one. Revisions can take up to a minute.
          </span>
        </div>
      )}

      {state.kind === "error" && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <p className="font-medium">
            {state.offline ? "The AI is not connected on this server, so we can't suggest layouts right now." : state.message}
          </p>
          <div className="flex flex-wrap gap-3">
            {onUseExample && (
              <button type="button" className={primaryButton} onClick={onUseExample}>
                Show the prepared example
              </button>
            )}
            {!state.offline && (
              <button type="button" className={onUseExample ? secondaryButton : primaryButton} onClick={onRetry}>
                Try again
              </button>
            )}
            <button type="button" className={secondaryButton} onClick={onArrangeMyself}>
              Arrange it myself
            </button>
          </div>
          <p className="text-sm">
            Arranging it yourself still runs every check live as you move things.
          </p>
        </div>
      )}

      {state.kind === "ready" && (
        <>
          {state.source === "example" && (
            <p className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950">
              <strong className="font-semibold">Prepared example.</strong> These two layouts were written by hand for the
              demo, standing in for Gemma. Every round below was checked just now by the same checker the AI&apos;s layouts go
              through.
            </p>
          )}
          <Overview result={state.result} />
          <div className="grid gap-6 xl:grid-cols-2">
            {state.result.options.map((o, i) => (
              <OptionCard key={o.layout.id} option={o} index={i} room={room} needs={needs} onPick={() => onPick(o)} />
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-4">
        <button type="button" className={linkButton} onClick={onBack}>
          Back to your needs
        </button>
      </div>
    </div>
  );
}

function Overview({ result }: { result: PlanResult }) {
  const fits = result.options.filter((o) => o.status === "fits").length;
  const revised = result.options.filter((o) => o.attempts.length > 1).length;
  return (
    <p className="text-stone-800">
      {fits === result.options.length
        ? "Both layouts pass every check."
        : fits === 0
          ? "Neither layout fits as asked. Try fewer or smaller pieces, or arrange it yourself."
          : "One layout passes every check. The other does not fit."}{" "}
      {revised > 0 &&
        `${revised === 1 ? "One was" : "Both were"} rejected by the checker at first and revised; you can see each round below.`}
    </p>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "✕"}</span>
      {label}
    </span>
  );
}

function OptionCard({
  option,
  index,
  room,
  needs,
  onPick,
}: {
  option: PlannedLayout;
  index: number;
  room: Room;
  needs: Needs;
  onPick: () => void;
}) {
  const fits = option.status === "fits";
  const headingId = `option-${index}-heading`;
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-lg font-semibold text-stone-900">
          <span className="text-stone-500">Option {index + 1}:</span> {option.layout.name}
        </h3>
        <StatusBadge ok={fits} label={fits ? "Passes every check" : "Doesn't fit"} />
      </header>

      <div className="aspect-[6/7] max-h-[380px] w-full self-center">
        <PlanView
          room={room}
          placements={option.layout.placements}
          clearances={needs.clearances}
          result={option.check}
          selectedId={null}
          label={`Plan of option ${index + 1}, ${option.layout.name}. ${fits ? "Passes every check." : "Does not fit."} The text summary on the next step lists every piece.`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-stone-800">{option.explanation}</p>
        <p className="text-xs text-stone-600">
          {option.explanationSource === "model"
            ? "Written by Gemma. Every number in it was checked against the room and the checker's results."
            : "Built from the checker's results."}
        </p>
      </div>

      {option.missing.length > 0 && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-900">Left out: {option.missing.join(", ")}.</p>
      )}

      <Rounds attempts={option.attempts} room={room} needs={needs} />

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
        <button type="button" className={fits ? primaryButton : secondaryButton} onClick={onPick}>
          {fits ? "Choose this layout" : "Open it and fix it myself"}
        </button>
      </div>
    </article>
  );
}

/** The rejection-then-fix story: every round, what the checker said, and a small plan of it. */
function Rounds({ attempts, room, needs }: { attempts: Attempt[]; room: Room; needs: Needs }) {
  if (attempts.length === 1) {
    const ok = attempts[0].check.ok && attempts[0].missing.length === 0;
    return (
      <p className="text-sm text-stone-700">
        {ok ? "Passed the checker on the first proposal." : "The first proposal failed and could not be revised."}
      </p>
    );
  }
  return (
    <section aria-label="How the checker shaped this layout" className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <h4 className="mb-2 text-sm font-semibold text-stone-900">How it got here</h4>
      <ol className="flex flex-col gap-3">
        {attempts.map((a) => {
          const ok = a.check.ok && a.missing.length === 0;
          const problems = [...a.check.violations.map((v) => v.message), ...a.missing.map((m) => `Left out ${m}.`)];
          return (
            <li key={a.round} className="flex gap-3">
              <div className="w-36 shrink-0 rounded border border-stone-200 bg-white p-0.5">
                <PlanView
                  room={room}
                  placements={a.layout.placements}
                  clearances={needs.clearances}
                  result={a.check}
                  selectedId={null}
                  label={`Round ${a.round + 1} plan`}
                />
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium text-stone-900">
                  Round {a.round + 1}: {a.round === 0 ? "first proposal" : "revised"}
                  <StatusBadge ok={ok} label={ok ? "Passed" : "Rejected"} />
                </p>
                {problems.length > 0 ? (
                  <ul className="list-disc pl-5 text-red-900">
                    {problems.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-stone-700">No problems found.</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
