import { z } from "zod";
import { checkLayout } from "@/lib/geometry";
import { Rotation, type CatalogItem, type CheckResult, type Layout, type Needs, type Placement, type Room } from "@/lib/schema";
import { emptyUsage, generateJson, ModelOutputError, type ModelCall, type Usage } from "./model";
import {
  describeNeeds,
  describeRoom,
  EXPLAIN_SYSTEM,
  LAYOUT_SYSTEM,
  proposePrompt,
  revisePrompt,
} from "./prompts/layout";

export const MAX_REVISIONS = 2;

const ProposedLayout = z.object({
  name: z.string().min(1).max(60),
  rationale: z.string().max(400),
  placements: z
    .array(z.object({ itemId: z.string().min(1), x: z.number(), y: z.number(), rotation: Rotation }))
    .min(1)
    .max(30),
});
type ProposedLayout = z.infer<typeof ProposedLayout>;

const ProposalReply = z.object({ layouts: z.array(ProposedLayout).min(1).max(2) });
const ExplainReply = z.object({ explanations: z.array(z.string().max(600)).min(1).max(2) });

/** One round of the loop: what the model proposed and what the checker said. */
export interface Attempt {
  round: number;
  layout: Layout;
  check: CheckResult;
  missing: string[];
}

export interface PlannedLayout {
  /** "fits" only when the final attempt passes every check and includes every requested item. */
  status: "fits" | "doesnt_fit";
  layout: Layout;
  check: CheckResult;
  missing: string[];
  /** Every round, first proposal first, so the UI can show the rejection and the fix. */
  attempts: Attempt[];
  explanation: string;
  explanationSource: "model" | "template";
}

export interface PlanResult {
  options: PlannedLayout[];
  usage: Usage;
}

interface PlanInput {
  room: Room;
  needs: Needs;
  catalog: ReadonlyMap<string, CatalogItem>;
}

function toLayout(p: ProposedLayout, id: string): Layout {
  const counts = new Map<string, number>();
  const placements: Placement[] = p.placements.map((pl) => {
    const n = (counts.get(pl.itemId) ?? 0) + 1;
    counts.set(pl.itemId, n);
    return { id: n === 1 ? pl.itemId : `${pl.itemId}-${n}`, ...pl };
  });
  return { id, name: p.name, rationale: p.rationale, placements };
}

/** Requested items the layout leaves out, as readable strings. */
function missingItems(layout: Layout, needs: Needs, catalog: ReadonlyMap<string, CatalogItem>): string[] {
  const have = new Map<string, number>();
  for (const p of layout.placements) have.set(p.itemId, (have.get(p.itemId) ?? 0) + 1);
  return needs.items
    .filter((n) => (have.get(n.itemId) ?? 0) < n.quantity)
    .map((n) => `${n.quantity - (have.get(n.itemId) ?? 0)} x ${catalog.get(n.itemId)?.name ?? n.itemId}`);
}

function evaluate(layout: Layout, round: number, input: PlanInput): Attempt {
  return {
    round,
    layout,
    check: checkLayout({
      room: input.room,
      placements: layout.placements,
      catalog: input.catalog,
      clearances: input.needs.clearances,
    }),
    missing: missingItems(layout, input.needs, input.catalog),
  };
}

const passes = (a: Attempt) => a.check.ok && a.missing.length === 0;
const badness = (a: Attempt) => a.check.violations.length + a.missing.length;

/** Deterministic explanation built only from checker output. Used when the model's text fails the number check. */
export function templateExplanation(p: Pick<PlannedLayout, "status" | "check" | "missing" | "attempts">): string {
  const fixed = p.attempts.length > 1 ? ` It took ${p.attempts.length - 1} revision${p.attempts.length > 2 ? "s" : ""} to get there.` : "";
  if (p.status === "fits") {
    const circle = p.check.turningCircle ? " There is room for the turning circle you asked for." : "";
    return `This arrangement passed every check against the room you entered.${circle}${fixed}`;
  }
  const problems = [...p.check.violations.map((v) => v.message), ...p.missing.map((m) => `Missing: ${m}.`)];
  const rounds = p.attempts.length - 1;
  return `This arrangement still does not fit after ${rounds} revision${rounds === 1 ? "" : "s"}. ${problems.join(" ")}`;
}

/** Every number the explanation may mention: room and opening sizes, item sizes, checker distances, small counts. */
function allowedNumbers(input: PlanInput, p: PlannedLayout): Set<number> {
  const ok = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const add = (inches: number) => {
    ok.add(Math.round(inches));
    ok.add(Math.round((inches / 12) * 10) / 10);
    ok.add(Math.floor(inches / 12));
    ok.add(Math.round(inches % 12));
  };
  [input.room.width, input.room.depth, input.room.height].forEach((m) => add(m.value));
  input.room.openings.forEach((o) => (add(o.width.value), add(o.offset.value)));
  p.layout.placements.forEach((pl) => {
    const c = input.catalog.get(pl.itemId);
    if (c) [c.width, c.depth, c.height].forEach(add);
  });
  p.attempts.forEach((a) => a.check.violations.forEach((v) => v.overlapIn !== undefined && add(v.overlapIn)));
  input.needs.clearances.forEach((c) => add(c.kind === "turning_circle" ? c.diameter : c.depth));
  return ok;
}

/** True if every number in `text` comes from the facts. Stops the model inventing measurements. */
export function numbersAreGrounded(text: string, allowed: Set<number>): boolean {
  const nums = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => allowed.has(Number(n)));
}

function factsFor(p: PlannedLayout, input: PlanInput, index: number): string {
  const items = p.layout.placements
    .map((pl) => `${input.catalog.get(pl.itemId)?.name ?? pl.itemId} at x ${pl.x}, y ${pl.y}, rotated ${pl.rotation}`)
    .join("; ");
  const history = p.attempts
    .map((a) => `round ${a.round}: ${passes(a) ? "passed" : [...a.check.violations.map((v) => v.message), ...a.missing.map((m) => `missing ${m}`)].join(" ")}`)
    .join(" | ");
  return `Option ${index + 1} "${p.layout.name}" (${p.status === "fits" ? "passes all checks" : "does NOT fit"}). Model's rationale: ${p.layout.rationale}. Items: ${items}. Check history: ${history}.${p.check.turningCircle ? " A turning circle fits." : ""}`;
}

/**
 * Gemma job 3: propose two layouts, check them with deterministic geometry, feed the violations back,
 * and revise at most MAX_REVISIONS times. A layout that still fails is returned as "doesnt_fit", never as passing.
 */
export async function planLayouts(call: ModelCall, input: PlanInput): Promise<PlanResult> {
  const usage = emptyUsage();
  const roomText = describeRoom(input.room);
  const needsText = describeNeeds(input.needs, input.catalog);

  const proposal = await generateJson(
    call,
    ProposalReply,
    { system: LAYOUT_SYSTEM, prompt: proposePrompt(roomText, needsText), label: "plan.propose" },
    usage,
  );

  const options: PlannedLayout[] = [];
  for (const [i, proposed] of proposal.layouts.entries()) {
    const id = `option-${i + 1}`;
    const attempts: Attempt[] = [evaluate(toLayout(proposed, id), 0, input)];
    while (!passes(attempts.at(-1)!) && attempts.length <= MAX_REVISIONS) {
      const last = attempts.at(-1)!;
      const problems = [...last.check.violations.map((v) => v.message), ...last.missing.map((m) => `Missing ${m}.`)];
      const lastJson = JSON.stringify({
        name: last.layout.name,
        rationale: last.layout.rationale,
        placements: last.layout.placements.map(({ itemId, x, y, rotation }) => ({ itemId, x, y, rotation })),
      });
      try {
        const revised = await generateJson(
          call,
          ProposedLayout,
          { system: LAYOUT_SYSTEM, prompt: revisePrompt(roomText, needsText, lastJson, problems), label: "plan.revise" },
          usage,
        );
        attempts.push(evaluate(toLayout(revised, id), attempts.length, input));
      } catch (e) {
        if (e instanceof ModelOutputError) break;
        throw e;
      }
    }
    // Keep the final attempt if it passes, otherwise the least-bad one.
    const final = passes(attempts.at(-1)!) ? attempts.at(-1)! : attempts.reduce((a, b) => (badness(b) < badness(a) ? b : a));
    const planned: PlannedLayout = {
      status: passes(final) ? "fits" : "doesnt_fit",
      layout: final.layout,
      check: final.check,
      missing: final.missing,
      attempts,
      explanation: "",
      explanationSource: "template",
    };
    planned.explanation = templateExplanation(planned);
    options.push(planned);
  }

  // Plain-language tradeoffs. Any number the model did not get from the facts sends us back to the template.
  try {
    const reply = await generateJson(
      call,
      ExplainReply,
      {
        system: EXPLAIN_SYSTEM,
        prompt: options.map((o, i) => factsFor(o, input, i)).join("\n\n"),
        label: "plan.explain",
      },
      usage,
    );
    options.forEach((o, i) => {
      const text = reply.explanations[i];
      if (text && numbersAreGrounded(text, allowedNumbers(input, o)) && !/\b(certified|compliant|up to code|ADA[- ]compliant)\b/i.test(text)) {
        o.explanation = text;
        o.explanationSource = "model";
      }
    });
  } catch (e) {
    if (!(e instanceof ModelOutputError)) throw e;
  }

  return { options, usage };
}
