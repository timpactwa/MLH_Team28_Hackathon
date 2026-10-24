import { z } from "zod";
import { Room, type Opening, type Wall } from "@/lib/schema";
import { emptyUsage, generateJson, type ModelCall, type Usage } from "./model";
import { PHOTO_PROMPT, PHOTO_SYSTEM } from "./prompts/photo";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Base64 length cap, about 6 MB of image. The client downscales to well under this. */
export const MAX_PHOTO_CHARS = 8_000_000;

export const PhotoInput = z.object({
  mimeType: z.enum(PHOTO_TYPES),
  data: z.string().min(100).max(MAX_PHOTO_CHARS).regex(/^[A-Za-z0-9+/=]+$/, "data must be base64"),
});
export type PhotoInput = z.infer<typeof PhotoInput>;

const PhotoReply = z.object({
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  openings: z
    .array(
      z.object({
        kind: z.enum(["door", "window"]),
        wall: z.enum(["north", "east", "south", "west"]),
        offset: z.number(),
        width: z.number().positive(),
        swing: z.enum(["in", "out", "none"]).optional(),
        hinge: z.enum(["start", "end"]).optional(),
      }),
    )
    .max(8),
  notes: z.string().max(400).optional(),
});
type PhotoReply = z.infer<typeof PhotoReply>;

export interface PhotoResult {
  room: Room;
  notes?: string;
  usage: Usage;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const half = (n: number) => Math.round(n * 2) / 2;
const estimated = (value: number) => ({ value: half(value), source: "estimated" as const });

/**
 * Turns the model's reply into a Room the editor can show. Every value is marked estimated,
 * sizes are clamped to plausible ranges, and openings are kept inside their walls.
 */
export function replyToRoom(reply: PhotoReply): Room {
  const width = clamp(reply.width, 72, 360);
  const depth = clamp(reply.depth, 72, 360);
  const height = clamp(reply.height, 84, 144);
  const wallLength = (w: Wall) => (w === "north" || w === "south" ? width : depth);
  const counts = { door: 0, window: 0 };

  const openings: Opening[] = [];
  for (const o of reply.openings) {
    const len = wallLength(o.wall);
    const w = clamp(o.width, 18, len);
    const offset = clamp(o.offset, 0, len - w);
    counts[o.kind] += 1;
    openings.push({
      id: `${o.kind}-${counts[o.kind]}`,
      kind: o.kind,
      wall: o.wall,
      offset: estimated(offset),
      width: estimated(w),
      swing: o.kind === "window" ? "none" : o.swing === "out" ? "out" : "in",
      hinge: o.hinge ?? "start",
    });
  }

  return Room.parse({
    id: "photo-room",
    name: "Room from your photo",
    width: estimated(width),
    depth: estimated(depth),
    height: estimated(height),
    dimensionsNote: "Estimated from your photo. Check every value before you rely on it.",
    openings,
  });
}

/** Gemma job 1: one inline photo to an estimated room. The image is never stored or logged. */
export async function estimateRoom(call: ModelCall, photo: PhotoInput): Promise<PhotoResult> {
  const usage = emptyUsage();
  const reply = await generateJson(
    call,
    PhotoReply,
    { system: PHOTO_SYSTEM, prompt: PHOTO_PROMPT, images: [photo], label: "photo" },
    usage,
  );
  return { room: replyToRoom(reply), notes: reply.notes || undefined, usage };
}
