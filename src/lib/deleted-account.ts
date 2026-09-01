/**
 * The two failures a NUMBER can carry rather than the person typing on it: its last
 * account was deleted, and the API will not let it open another one yet.
 *
 *   PHONE_COOLDOWN    the deletion finished; the number is serving its wait, and
 *                     `retry_after` says how long is left.
 *   ACCOUNT_DELETING  the deletion is still running.
 *
 * Both arrive from `POST /v1/auth/otp` and from `POST /v1/auth/otp/verify` — the
 * verify one AFTER the code has been accepted as correct — and neither is a bad code,
 * a bad number, or anything a retry can pass. Left to the routes' generic branches
 * they came out as "That code isn't right" or "Please try again", which sends someone
 * back to retype a code that was right, against a number that cannot be used at all.
 *
 * The wording is the app's OTPScreen, verbatim, so both surfaces answer a deletion
 * identically.
 */
import { ApiFailure } from "./v1/errors";

const UNITS: Array<[string, number]> = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/**
 * `retry_after` seconds as the app words them: name the largest unit that fits plus
 * the one below it, rounding UP so the wait is never understated.
 */
export function cooldownWords(seconds: number | null): string {
  const total = Math.max(1, Number(seconds) || 0);
  const index = Math.max(0, UNITS.findIndex(([, size]) => total >= size));
  const [smallName, smallSize] = UNITS[Math.min(index + 1, UNITS.length - 1)];
  const rounded = Math.ceil(total / smallSize) * smallSize;
  // Rounding up can spill into the unit above — "1 day", never "24 hours".
  if (index > 0 && rounded >= UNITS[index - 1][1]) return cooldownWords(rounded);
  const [name, size] = UNITS[index];
  const whole = Math.floor(rounded / size);
  const rest = index === UNITS.length - 1 ? 0 : (rounded - whole * size) / smallSize;
  const part = (n: number, unit: string) => `${String(n)} ${unit}${n === 1 ? "" : "s"}`;
  if (whole === 0) return part(rest, smallName);
  if (rest === 0) return part(whole, name);
  return `${part(whole, name)} ${part(rest, smallName)}`;
}

/** The sentence to show, or null when this failure is about something else. */
export function deletedAccountMessage(cause: unknown): string | null {
  if (!(cause instanceof ApiFailure)) return null;
  if (cause.code === "PHONE_COOLDOWN") {
    return `This number belonged to a recently deleted account. It can open a new one in ${cooldownWords(cause.retryAfter)}.`;
  }
  if (cause.code === "ACCOUNT_DELETING") {
    return "This account is being deleted. Once deletion finishes and its waiting period passes, the number can start a new account.";
  }
  return null;
}

/**
 * The body the funnel's routes answer with, and the shape the screens branch on.
 *
 * 409, not the API's own status: the codes ride in on a 429 and on a 400 depending on
 * which call tripped them, and the screens must not read either as "wait a moment and
 * retry" or "that code was wrong". `blocked` is what tells the OTP screen to stop
 * offering a retype and a resend, both of which are dead ends for this number.
 */
export const deletedAccountResponse = (message: string) =>
  Response.json({ error: message, blocked: true }, { status: 409 });
