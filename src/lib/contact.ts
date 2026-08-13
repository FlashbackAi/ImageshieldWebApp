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
