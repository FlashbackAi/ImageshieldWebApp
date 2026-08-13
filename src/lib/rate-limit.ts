import "server-only";

/**
 * Fixed-window counters, held in memory.
 *
 * Every OTP this funnel sends costs money and lands on somebody's real phone, so
 * the send route can't be an open relay. This is deliberately the small version:
 * one Next process, one Map. It resets on deploy and doesn't span instances — if
 * the site is ever run behind more than one worker, this needs to move to a shared
 * store (or nginx). Until then it's the difference between "a script can text
 * 10,000 strangers" and "it can't".
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Keeps a long-running process from accumulating a key per phone number ever seen. */
function sweep(nowMs: number): void {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= nowMs) windows.delete(key);
  }
}

/**
 * Records a hit and reports whether it's allowed. `false` means over the limit —
 * callers should answer 429 without doing the work.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const nowMs = Date.now();
  sweep(nowMs);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= nowMs) {
    windows.set(key, { count: 1, resetAt: nowMs + windowMs });
    return true;
  }

  existing.count += 1;
  return existing.count <= limit;
}

/** Best-effort client address. Behind nginx the socket address is always the proxy,
 *  so the forwarded header is the only per-visitor signal available. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
