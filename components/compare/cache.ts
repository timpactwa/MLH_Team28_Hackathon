import type { NeedItem } from "@/lib/schema";

// Concepts are cached in the browser only, so the same photo, style and furniture never pays twice (T-403).
// The server keeps nothing. sessionStorage ends with the tab; it can be blocked or full, so it is best effort.

const memory = new Map<string, string>();
const PREFIX = "room-fit:concept:";

/** SHA-256 of the photo, style and furniture list. */
export async function cacheKey(photoUrl: string, style: string, items: NeedItem[]): Promise<string> {
  const list = [...items].sort((a, b) => a.itemId.localeCompare(b.itemId)).map((i) => `${i.itemId}x${i.quantity}`);
  const bytes = new TextEncoder().encode(`${style}\n${list.join(",")}\n${photoUrl}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function readCached(key: string): string | null {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    return sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeCached(key: string, url: string): void {
  memory.set(key, url);
  try {
    sessionStorage.setItem(PREFIX + key, url);
  } catch {
    // Quota or blocked storage: the in-memory copy still covers this visit.
  }
}
