import { describe, expect, it } from "vitest";
import type { ModelCall, ModelRequest } from "./model";
import { estimateRoom, PhotoInput, replyToRoom } from "./photo";

const photo: PhotoInput = { mimeType: "image/jpeg", data: "A".repeat(200) };

function stub(replies: string[]): ModelCall & { calls: ModelRequest[] } {
  const calls: ModelRequest[] = [];
  const fn = (async (req: ModelRequest) => {
    calls.push(req);
    return { text: replies.shift() ?? "", latencyMs: 5, usage: { inputTokens: 1000, outputTokens: 80 } };
  }) as ModelCall & { calls: ModelRequest[] };
  fn.calls = calls;
  return fn;
}

describe("photo to room", () => {
  it("marks every value estimated and keeps openings inside their walls", () => {
    const room = replyToRoom({
      width: 130,
      depth: 150,
      height: 100,
      openings: [
        { kind: "door", wall: "south", offset: 120, width: 34, swing: "in", hinge: "end" },
        { kind: "window", wall: "north", offset: -5, width: 400, swing: "in" },
      ],
    });
    const measures = [room.width, room.depth, room.height, ...room.openings.flatMap((o) => [o.offset, o.width])];
    expect(measures.every((m) => m.source === "estimated")).toBe(true);
    const [door, window] = room.openings;
    expect(door.offset.value + door.width.value).toBeLessThanOrEqual(130);
    expect(window).toMatchObject({ offset: { value: 0 }, width: { value: 130 }, swing: "none" });
  });

  it("clamps implausible sizes", () => {
    const room = replyToRoom({ width: 20, depth: 9000, height: 40, openings: [] });
    expect([room.width.value, room.depth.value, room.height.value]).toEqual([72, 360, 84]);
  });

  it("sends the photo inline and retries once on a bad reply", async () => {
    const call = stub([
      "Sorry, I can't measure rooms.",
      '{"width":144,"depth":168,"height":96,"openings":[{"kind":"door","wall":"south","offset":12,"width":32}],"notes":"Ceiling height is a guess."}',
    ]);
    const result = await estimateRoom(call, photo);
    expect(call.calls).toHaveLength(2);
    expect(call.calls[0].images).toEqual([photo]);
    expect(result.room.openings[0]).toMatchObject({ id: "door-1", swing: "in", hinge: "start" });
    expect(result.notes).toBe("Ceiling height is a guess.");
    expect(result.usage.calls).toBe(2);
  });

  it("rejects non-image uploads and non-base64 data", () => {
    expect(PhotoInput.safeParse({ ...photo, mimeType: "application/pdf" }).success).toBe(false);
    expect(PhotoInput.safeParse({ ...photo, data: "not base64!".repeat(20) }).success).toBe(false);
  });
});
