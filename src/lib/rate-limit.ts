import "server-only";

import { trustedProxyHops } from "./env";

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

/**
 * Best-effort client address, and the key the per-IP limits are counted against.
 *
 * `TRUSTED_PROXY_HOPS` — how many proxies sit between this process and the internet,
 * each appending to `X-Forwarded-For` — is the whole reason the per-IP limit means
 * anything. `X-Forwarded-For` is a header the client writes, and the LEFTMOST entry is
 * therefore whatever the client felt like claiming; reading that entry hands out a
 * fresh bucket per request to anyone who sends `X-Forwarded-For: 1.2.3.4` and rotates
 * it, which is the per-IP cap removed rather than enforced.
 *
 * What can't be forged is the entry the nearest trusted proxy appended, because it
 * appends the address of the socket it actually accepted (nginx's
 * `$proxy_add_x_forwarded_for` is "whatever arrived, plus the peer"). With one proxy
 * that is the last entry; with N, it's the Nth from the right. Forged entries only
 * ever pad the left, so counting from the right is stable however many are sent.
 *
 * Returns "unknown" when no trusted proxy is declared, or when one is and it sent no
 * forwarded header: that lumps those callers into a single shared bucket, which fails
 * closed. A misconfiguration makes the funnel stingy with codes rather than making
 * the cap disappear.
 */
function clientIp(request: Request): string {
  const hops = trustedProxyHops();
  if (hops === 0) {
    // Nothing in front of us is vouching for these headers, so neither do we. Next
    // does not expose the socket address, so there is nothing else to key on.
    return "unknown";
  }

  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (chain.length) {
    // Clamped: a chain shorter than the configured hop count means a proxy didn't
    // append, and the leftmost entry is the closest thing to the truth on offer.
    return chain[Math.max(chain.length - hops, 0)];
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * A limit counted against the caller's address, for routes with no better key.
 *
 * `allowOtpSend` has a phone number to count against; the routes behind a /v1 session
 * have nothing of the sort — the API takes no identifier and this side deliberately
 * stops holding a phone number once a session exists. The address is what is left,
 * and it is the same forgery-resistant entry the OTP caps use.
 *
 * `name` separates one route's bucket from another's, so a visitor retrying a score
 * write doesn't spend their allowance for requesting codes.
 */
export function allowPerIp(
  request: Request,
  name: string,
  limit: number,
  windowMs: number,
): boolean {
  return allow(`${name}:ip:${clientIp(request)}`, limit, windowMs);
}

/**
 * Ceiling on OTPs sent across the whole site per hour.
 *
 * The per-phone and per-IP caps both key on something the caller influences; this one
 * doesn't, so it's the backstop that bounds the bill if either is ever wrong (a
 * botnet with real addresses defeats per-IP by definition). Generous next to what a
 * funnel actually sends, low enough that a runaway costs tens of messages rather than
 * thousands. Tripping it is a page for whoever is on call, hence the log.
 */
const GLOBAL_SENDS_PER_HOUR = 200;

/**
 * The send policy `/api/otp/start` and `/api/otp/resend` share.
 *
 * Both count against the SAME per-phone and per-IP windows on purpose — otherwise
 * resending would be a second, uncapped budget of messages to the same handset. It
 * lives here so the two routes can't drift into two different policies.
 */
export function allowOtpSend(
  request: Request,
  phone: string,
): { ok: true } | { ok: false; error: string; status: 429 } {
  // Two limits doing different jobs: the per-phone one stops a retry loop
  // (accidental or otherwise) from texting one person repeatedly, the per-IP one
  // stops one visitor from working through a list of numbers.
  if (!allow(`otp:phone:${phone}`, 3, 10 * 60 * 1000)) {
    return {
      ok: false,
      status: 429,
      error: "Too many codes requested. Try again in a few minutes.",
    };
  }

  if (!allow(`otp:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return {
      ok: false,
      status: 429,
      error: "Too many attempts from this network. Try again later.",
    };
  }

  if (!allow("otp:global", GLOBAL_SENDS_PER_HOUR, 60 * 60 * 1000)) {
    console.error("otp global send limit reached", {
      limit: GLOBAL_SENDS_PER_HOUR,
    });
    return {
      ok: false,
      status: 429,
      error: "We're sending too many codes right now. Please try again shortly.",
    };
  }

  return { ok: true };
}
