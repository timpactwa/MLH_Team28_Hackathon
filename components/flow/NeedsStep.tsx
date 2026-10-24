"use client";

import { useId, useState } from "react";
import { DOOR_CLEAR, TURNING } from "@/components/editor/FurniturePanel";
import { feetInches } from "@/components/editor/format";
import { catalog, catalogById } from "@/data/catalog";
import type { NeedsResult } from "@/lib/ai/needs";
import type { ClearanceRequirement, NeedItem, Needs } from "@/lib/schema";
import { isAiOffline, postJson } from "./api";
import { EXAMPLE_NEEDS_TEXT, exampleNeeds } from "./example";
import { StepHeading } from "./StepHeading";
import { field, linkButton, primaryButton, secondaryButton } from "./styles";

const STYLES = ["Warm and cozy", "Clean and minimal", "Bright and airy", "Mid-century", "No preference"];

type Reading =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; notes?: string; source: "ai" | "example" }
  | { kind: "error"; message: string; offline: boolean };

/** Step 3: the renter's own words become an editable list of furniture and the clear space they need. */
export function NeedsStep({
  initial,
  onSubmit,
  onBack,
  focus,
}: {
  initial: Needs;
  onSubmit: (needs: Needs) => void;
  onBack: () => void;
  focus: boolean;
}) {
  const textId = useId();
  const styleId = useId();
  const addId = useId();
  const [text, setText] = useState(initial.text);
  const [style, setStyle] = useState(initial.style ?? STYLES[0]);
  const [items, setItems] = useState<NeedItem[]>(initial.items);
  const [clearances, setClearances] = useState<ClearanceRequirement[]>(initial.clearances);
  const [toAdd, setToAdd] = useState(catalog[0].id);
  const [reading, setReading] = useState<Reading>({ kind: "idle" });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const has = (kind: ClearanceRequirement["kind"]) => clearances.some((c) => c.kind === kind);
  const toggle = (req: ClearanceRequirement) =>
    setClearances((cs) => (cs.some((c) => c.kind === req.kind) ? cs.filter((c) => c.kind !== req.kind) : [...cs, req]));
  const setQty = (itemId: string, quantity: number) =>
    setItems((list) =>
      quantity <= 0 ? list.filter((i) => i.itemId !== itemId) : list.map((i) => (i.itemId === itemId ? { ...i, quantity } : i)),
    );
  const add = (itemId: string) =>
    setItems((list) =>
      list.some((i) => i.itemId === itemId)
        ? list.map((i) => (i.itemId === itemId ? { ...i, quantity: Math.min(6, i.quantity + 1) } : i))
        : [...list, { itemId, quantity: 1 }],
    );

  async function read() {
    if (!text.trim()) {
      setReading({ kind: "error", message: "Write a sentence or two about what you need first.", offline: false });
      return;
    }
    setReading({ kind: "loading" });
    const res = await postJson<NeedsResult>("/api/needs", { text });
    if (!res.ok) {
      setReading({ kind: "error", message: res.error, offline: isAiOffline(res) });
      return;
    }
    setItems(res.data.needs.items);
    setClearances(res.data.needs.clearances);
    if (res.data.needs.style) setStyle(res.data.needs.style);
    setReading({ kind: "done", notes: res.data.notes, source: "ai" });
  }

  function fillExampleReading() {
    setItems(exampleNeeds.items);
    setClearances(exampleNeeds.clearances);
    setStyle(exampleNeeds.style ?? STYLES[0]);
    setReading({ kind: "done", source: "example" });
  }

  function submit() {
    if (items.length === 0) {
      setSubmitError("Add at least one piece of furniture.");
      return;
    }
    setSubmitError(null);
    onSubmit({ text, items, clearances, style });
  }

  const isExampleText = text.trim() === EXAMPLE_NEEDS_TEXT;
  const styleOptions = STYLES.includes(style) ? STYLES : [style, ...STYLES];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-2">
        <StepHeading focusOnMount={focus}>What do you need this room to do?</StepHeading>
        <p className="text-stone-700">
          Say it the way you would to a friend. Gemma turns it into a list of furniture and the clear floor space you
          need. You can change the list before anything is placed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={textId} className="text-sm font-medium text-stone-800">
              In your own words
            </label>
            <textarea
              id={textId}
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For example: I work from home, I need a queen bed, and my partner uses a wheelchair."
              className={`${field} resize-y leading-relaxed`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={styleId} className="text-sm font-medium text-stone-800">
              Style
            </label>
            <select id={styleId} value={style} onChange={(e) => setStyle(e.target.value)} className={`${field} self-start`}>
              {styleOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={secondaryButton} onClick={read} disabled={reading.kind === "loading"}>
              {reading.kind === "loading" ? (
                <>
                  <Spinner /> Reading…
                </>
              ) : (
                "Turn this into a list"
              )}
            </button>
          </div>
          <div role="status" aria-live="polite" className="text-sm">
            {reading.kind === "done" && (
              <p className="rounded-md bg-emerald-50 p-3 text-emerald-900">
                {reading.source === "ai"
                  ? "Gemma filled in the list. Check it, and change anything that is wrong."
                  : "Filled in the prepared reading of the example. Check it, and change anything that is wrong."}
                {reading.notes && <span className="mt-1 block text-emerald-800">Note from Gemma: {reading.notes}</span>}
              </p>
            )}
            {reading.kind === "error" && (
              <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-amber-950">
                <p>
                  {reading.offline ? "The AI is not connected on this server, so we can't read your words right now." : reading.message}
                </p>
                <p>
                  {isExampleText && reading.offline ? (
                    <button type="button" className={linkButton} onClick={fillExampleReading}>
                      Use the prepared reading of the example
                    </button>
                  ) : (
                    "You can still build the list yourself on the right."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="font-semibold text-stone-900">Furniture</h3>
          {items.length === 0 ? (
            <p className="text-sm text-stone-600">Nothing yet. Turn your words into a list, or add pieces below.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-200">
              {items.map((i) => {
                const c = catalogById.get(i.itemId);
                if (!c) return null;
                return (
                  <li key={i.itemId} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-stone-900">
                      {c.name}
                      <span className="block text-xs text-stone-600">
                        {feetInches(c.width)} by {feetInches(c.depth)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1" role="group" aria-label={`${c.name} quantity`}>
                      <button
                        type="button"
                        className={`${secondaryButton} size-8 px-0`}
                        aria-label={i.quantity === 1 ? `Remove ${c.name}` : `One fewer ${c.name}`}
                        onClick={() => setQty(i.itemId, i.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium tabular-nums">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        className={`${secondaryButton} size-8 px-0`}
                        aria-label={`One more ${c.name}`}
                        disabled={i.quantity >= 6}
                        onClick={() => setQty(i.itemId, i.quantity + 1)}
                      >
                        +
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={addId} className="text-sm font-medium text-stone-800">
                Add a piece
              </label>
              <select id={addId} value={toAdd} onChange={(e) => setToAdd(e.target.value)} className={field}>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.width} x {c.depth} in)
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className={secondaryButton} onClick={() => add(toAdd)}>
              Add
            </button>
          </div>

          <fieldset className="flex flex-col gap-2 border-t border-stone-200 pt-3">
            <legend className="mb-1 font-semibold text-stone-900">Clear space</legend>
            <label className="flex items-start gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-emerald-700"
                checked={has("turning_circle")}
                onChange={() => toggle(TURNING)}
              />
              <span>
                A clear 5 ft (60 in) circle for turning a wheelchair
                <span className="block text-xs text-stone-600">The ADA turning-space size. We check the floor, not a route to it.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-sky-700"
                checked={has("door_clearance")}
                onChange={() => toggle(DOOR_CLEAR)}
              />
              <span>4 ft (48 in) of clear floor inside each door</span>
            </label>
          </fieldset>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-4">
        <button type="button" className={primaryButton} onClick={submit}>
          Suggest two layouts
        </button>
        <button type="button" className={linkButton} onClick={onBack}>
          Back
        </button>
        {submitError && (
          <p role="alert" className="text-sm font-medium text-red-800">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}
