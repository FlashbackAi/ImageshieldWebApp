/**
 * SMS one-time-password login. There is no password anywhere in this API.
 *
 * Both calls are anonymous — they are how a session begins, so they cannot carry one.
 */
import "server-only";

import { call } from "./client";
import type { TokenPair } from "../session";

export type OtpChallenge = {
  /** What `verifyOtp` is verified against. The phone number is not sent again. */
  challenge_id: string;
  expires_at: string;
  /** When a resend is allowed, as an ISO 8601 instant — NOT a count of seconds,
   *  whatever the name suggests. `resendCooldownSeconds` turns it into one. */
  resend_after: string;
};

/**
 * 202 Accepted, and a real SMS goes out.
 *
 * Issuing a new challenge CONSUMES any live one for that phone, which is what makes
 * resend a re-issue rather than a second text against the same id: the challenge id
 * in the cookie has to be replaced or the code the visitor is now holding will be
 * verified against a challenge the API has already discarded.
 *
 * 429 RATE_LIMITED (per-IP count, per-phone count, or the resend cooldown) carries a
 * `retry_after`. 400 VALIDATION_FAILED means the number wasn't E.164.
 */
export const requestOtp = (phoneE164: string) =>
  call<OtpChallenge>("POST", "/v1/auth/otp", {
    body: { phone_e164: phoneE164 },
  });

/**
 * `resend_after` as a countdown the OTP screen can tick down.
 *
 * The field is an ISO timestamp despite its name, so relaying it straight through
 * put a string into a numeric `useState` and the "Resend in Ns" counter went to NaN
 * on the first tick — the resend link then never re-enabled.
 *
 * Null when the API sends something unparseable, which the screen answers with its
 * own fallback rather than a broken counter. Clamped at zero: a cooldown already in
 * the past is simply over.
 */
export function resendCooldownSeconds(challenge: OtpChallenge): number | null {
  const at = Date.parse(challenge.resend_after);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

/**
 * The onboarding block `verify` answers with — the server's own account of what is
 * left to do, replacing the old `registered` / `profileCompleted` / `selfieUploaded`
 * flags this side used to infer from.
 */
export type Onboarding = {
  next_step: string | null;
  /** Steps still standing between this account and full coverage. Observed on the
   *  live API and absent from the collection, so it is optional here. */
  blocking_coverage?: string[];
  profile_complete?: boolean;
  quiz_completed?: boolean;
  seat_claimed?: boolean;
  consent_signed?: boolean;
  enrolled?: boolean;
  email_verified?: boolean;
  photos_uploaded?: boolean;
  notifications_enabled?: boolean;
  skipped_steps?: string[];
};

/**
 * Exchanges the code for a token pair.
 *
 * `code` must be EXACTLY six digits — the API validates the length, and the old
 * backend's four-to-eight tolerance would now just produce a 400 that reads as a
 * wrong code. A wrong or expired code is 401, not the legacy 400.
 *
 * Attempts are capped per challenge, so a burned one needs a fresh `requestOtp`
 * rather than another try.
 */
export const verifyOtp = (challengeId: string, code: string) =>
  call<TokenPair & { onboarding?: Onboarding }>("POST", "/v1/auth/otp/verify", {
    body: { challenge_id: challengeId, code },
  });
