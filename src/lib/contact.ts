/**
 * Name / email / phone rules, shared by the form and the route handlers so the
 * client can't submit something the server would then have to guess about.
 *
 * Client-safe: no secrets, no server-only import.
 */

/**
 * E.164, the format the app's login sends (`+${callingCode}${digits}`) and the
 * format Twilio needs. The backend keys the user record on this string, so a
 * missing country code doesn't just fail to send an SMS — it forks a second
 * record that the app will never find.
 */
const E164 = /^\+[1-9]\d{7,14}$/;

/** Deliberately loose: rejecting valid-but-unusual addresses costs more leads
 *  than accepting a typo, and nothing here depends on the mail arriving. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Contact = { fullName: string; email: string; phone: string };

/**
 * Strips separators and settles on a leading `+` — but never invents one. A bare
 * "5551230000" is not a number we can key a user record on: prefixing `+` would
 * turn it into the perfectly valid Colombian-looking +5551230000 and quietly write
 * the score to a record nobody owns. The form supplies the country code (a picker,
 * as in the app's LoginScreen) or the submission is rejected.
 */
export function normalizePhone(raw: string): string {
  // Users paste spaces, dashes and brackets from their contacts app.
  const cleaned = raw.replace(/[^\d+]/g, "");
  // 00 is how most of the world writes the international prefix by hand.
  return cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;
}

/**
 * Splits the one "Full Name" field into the parts `/update-profile` stores.
 *
 * The app collects these as two inputs (ProfileSetupScreen) and the record has a
 * column for each, so the web's single field has to be broken up the same way or
 * the app's profile screen comes back with a blank surname. First word is the
 * given name, everything after it the family name — wrong for some names, but it
 * matches what the app would have written for the same typing, and `fullName` is
 * stored verbatim alongside so nothing is actually lost.
 */
export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function validateContact(
  raw: unknown,
): { ok: true; contact: Contact } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "missing body" };
  }
  const { fullName, email, phone } = raw as Record<string, unknown>;

  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return { ok: false, error: "Enter your full name" };
  }
  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (typeof phone !== "string") {
    return { ok: false, error: "Enter your phone number" };
  }

  const normalized = normalizePhone(phone);
  if (!E164.test(normalized)) {
    return { ok: false, error: "Enter your number with its country code" };
  }

  return {
    ok: true,
    contact: {
      // Trimmed here rather than at the call site: these strings are written to
      // the user record and read back into the app's UI.
      fullName: fullName.trim().slice(0, 80),
      email: email.trim().toLowerCase().slice(0, 254),
      phone: normalized,
    },
  };
}
