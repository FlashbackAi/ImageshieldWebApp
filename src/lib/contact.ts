/**
 * Name / email / phone / date-of-birth rules, shared by the form and the route
 * handlers so the client can't submit something the server would then have to guess
 * about.
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

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** `YYYY-MM-DD`, the format `PATCH /v1/me/profile` stores `date_of_birth` in. */
  dob: string;
};

/**
 * The youngest date of birth accepted, and the oldest.
 *
 * 13 is not arbitrary: the live quiz definition's youngest age band is `13-17`, so
 * the product already expects teenagers, and a floor below the band the scoring
 * itself starts at would collect a birth date nothing downstream can score. Raise it
 * if the funnel is ever meant to be adults-only — this is the one place to do it.
 *
 * The ceiling exists to catch a mistyped year rather than to judge anyone: a visitor
 * who fat-fingers 1024 should be told, not silently recorded as 1001 years old.
 */
const MIN_AGE_YEARS = 13;
const MAX_AGE_YEARS = 120;

/**
 * The same range as two dates, for the calendar to draw.
 *
 * Derived here rather than re-expressed in the picker, because a picker that offers
 * a date `validateDob` refuses is a form that rejects what it just invited you to
 * click — and the two drifting apart is exactly what happens when the bound is
 * written twice.
 *
 * `latest` is the day someone turns MIN_AGE today, and is inclusive: `ageOn` returns
 * exactly MIN_AGE for it. `earliest` is the day AFTER their MAX_AGE+1 birthday, which
 * looks off by one and is not — `age > MAX_AGE_YEARS` only rejects at MAX_AGE + 1, so
 * someone 120 years and six months old is still accepted and the floor has to leave
 * room for them.
 *
 * UTC on both sides, matching `ageOn`. `today` is a parameter so this is testable
 * without stubbing the clock.
 */
export function dobBounds(today: Date = new Date()): { earliest: Date; latest: Date } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  return {
    earliest: new Date(Date.UTC(y - MAX_AGE_YEARS - 1, m, d + 1)),
    latest: new Date(Date.UTC(y - MIN_AGE_YEARS, m, d)),
  };
}

/** `YYYY-MM-DD` and nothing else — the shape, before the date is checked for being real. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whole years between a birth date and today, both read in UTC.
 *
 * UTC on both sides on purpose: mixing a UTC-parsed birth date with a local "today"
 * shifts the comparison by a day for anyone west of Greenwich, which turns someone's
 * 13th birthday into a rejection until the afternoon.
 */
function ageOn(birth: Date, today: Date): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Parses and range-checks a date of birth.
 *
 * The round-trip comparison is what rejects a date that matches the pattern but does
 * not exist: `new Date("2004-02-31")` does not throw, it rolls forward to March 2nd,
 * so a visitor who typed a day that isn't there would otherwise have a different date
 * than the one they entered written to their record.
 */
export function validateDob(
  raw: unknown,
): { ok: true; dob: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !ISO_DATE.test(raw.trim())) {
    return { ok: false, error: "Enter your date of birth" };
  }
  const value = raw.trim();

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { ok: false, error: "That date doesn't exist — check the day and month" };
  }

  const today = new Date();
  const age = ageOn(parsed, today);
  if (age < 0) {
    return { ok: false, error: "Your date of birth can't be in the future" };
  }
  if (age < MIN_AGE_YEARS) {
    return {
      ok: false,
      error: `You need to be at least ${MIN_AGE_YEARS} to use ImageShield`,
    };
  }
  if (age > MAX_AGE_YEARS) {
    return { ok: false, error: "Check the year — that date looks like a typo" };
  }

  return { ok: true, dob: value };
}

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

/** Both name parts are stored as typed, so the only shaping is a trim and a cap.
 *  80 each matches what the legacy `fullName` field allowed for the pair. */
const MAX_NAME_LENGTH = 80;

export function validateContact(
  raw: unknown,
): { ok: true; contact: Contact } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "missing body" };
  }
  const { firstName, lastName, email, phone, dob } = raw as Record<
    string,
    unknown
  >;

  if (typeof firstName !== "string" || firstName.trim() === "") {
    return { ok: false, error: "Enter your first name" };
  }
  /* A surname is asked for but not insisted on: mononymous people exist, the API
     takes `last_name` as a nullable column, and rejecting them at the one gate in
     front of the score would be a strange place to draw that line. */
  if (typeof lastName !== "string") {
    return { ok: false, error: "Enter your last name" };
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

  /* Last, so a visitor who got several fields wrong is told about the phone number
     before the birth date — the phone is the one the whole funnel turns on. */
  const parsedDob = validateDob(dob);
  if (!parsedDob.ok) {
    return { ok: false, error: parsedDob.error };
  }

  return {
    ok: true,
    contact: {
      // Trimmed here rather than at the call site: these strings are written to
      // the user record and read back into the app's UI.
      firstName: firstName.trim().slice(0, MAX_NAME_LENGTH),
      lastName: lastName.trim().slice(0, MAX_NAME_LENGTH),
      email: email.trim().toLowerCase().slice(0, 254),
      phone: normalized,
      dob: parsedDob.dob,
    },
  };
}
