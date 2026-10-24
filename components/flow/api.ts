export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** POSTs JSON and never throws. `status` is 0 when the server could not be reached. */
export async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json) return { ok: true, data: json as T };
    return { ok: false, status: res.status, error: json?.error ?? `The server returned an error (${res.status}).` };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }
}

/** 503 means the server has no AI key, so the UI offers the non-AI paths instead of a retry. */
export const isAiOffline = (r: { ok: false; status: number }) => r.status === 503;
