/**
 * The person record behind a lead.
 *
 * Names and email are SEPARATE writes on /v1, and conflating them is a 400. The old
 * funnel posted one `/update-profile` body carrying `phone`, `firstName`, `lastName`,
 * `email` and `fullName` together; `PATCH /v1/me/profile` takes first_name, last_name,
 * date_of_birth, employer_name, occupation and school_name, rejects anything else,
 * and takes no phone at all because the session already says who this is.
 *
 * Email has its own route because setting one SENDS A VERIFICATION EMAIL and leaves
 * the address unverified until the link is opened. That is a real behaviour change
 * for the funnel: every lead who verifies their phone now also receives a mail. It is
 * also why `saveLead` only calls it when the address actually differs from what is on
 * record — re-sending on every save would mail a fresh link to a returning visitor
 * who changed nothing.
 */
import "server-only";

import { callAsUser } from "../session";
import type { Me } from "./me";

export type ProfileFields = {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string | null;
  employer_name?: string | null;
  occupation?: string | null;
  school_name?: string | null;
};

/**
 * Only the keys actually present are sent: the API builds the update from the keys it
 * receives, so including a field as `undefined` would blank it rather than leave it
 * alone — and unknown keys are rejected outright rather than ignored.
 */
export const patchProfile = (fields: ProfileFields) =>
  callAsUser<Me["person"]>("PATCH", "/v1/me/profile", { body: fields });

/** 202 Accepted. Records the address and sends the verification link. */
export const setEmail = (email: string) =>
  callAsUser<void>("POST", "/v1/me/email", { body: { email } });
