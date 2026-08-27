/**
 * `GET /v1/me` — the one read that answers what the old backend needed four calls
 * for (`/check-user`, `/getUserProfile`, `/users/{phone}`, `/check-email-verification`).
 *
 * It takes no identifier: the person IS the session. Nothing here accepts a phone,
 * which is why the funnel no longer carries one past the OTP screen.
 *
 * Empty is not an error. A brand-new account gets 200 with nulls — `household` and
 * `score` are null before a plan and before the quiz — so there is nothing here to
 * special-case the way the legacy 404s forced.
 */
import "server-only";

import { readAsUser, callAsUser } from "../session";
import type { Onboarding } from "./auth";

export type Me = {
  account: { phone_e164: string; status: string };
  person: {
    person_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    email_verified: boolean;
    date_of_birth: string | null;
    employer_name: string | null;
    occupation: string | null;
    school_name: string | null;
  };
  onboarding: Onboarding;
  /** Null before the quiz. The funnel reads the full record from `/v1/me/score`
   *  instead — this summary carries no breakdown. */
  score: { total_score: number; band: string; computed_at: string } | null;
};

/** For a server component's render. Throws `SessionUnavailable` rather than refreshing. */
export const readMe = () => readAsUser<Me>("GET", "/v1/me");

/** For a route handler, which may refresh and persist the rotated pair. */
export const fetchMe = () => callAsUser<Me>("GET", "/v1/me");

/** The display name for the result screen. Falls back rather than rendering "null". */
export function firstNameOf(me: Me): string {
  return me.person.first_name?.trim() || "there";
}
