export const STEPS = [
  { id: "start", label: "Room" },
  { id: "room", label: "Check measurements" },
  { id: "needs", label: "Your needs" },
  { id: "plans", label: "Compare layouts" },
  { id: "tour", label: "Walk through" },
] as const;

export type Step = (typeof STEPS)[number]["id"];

export function Stepper({ current }: { current: Step }) {
  const at = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Progress" className="print:hidden">
      <ol className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
        {STEPS.map((s, i) => {
          const state = i < at ? "done" : i === at ? "current" : "todo";
          return (
            <li key={s.id} aria-current={state === "current" ? "step" : undefined} className="flex items-center gap-1">
              <span
                className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                  state === "current"
                    ? "bg-stone-900 text-white"
                    : state === "done"
                      ? "bg-emerald-700 text-white"
                      : "border border-stone-300 bg-white text-stone-600"
                }`}
                aria-hidden
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "current" ? "font-semibold text-stone-900" : "text-stone-600"}>
                {s.label}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="mx-1 h-px w-4 bg-stone-300 sm:w-8" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
