import "server-only";

/**
 * The server's configuration, validated once instead of trusted four times.
 *
 * Every value here was previously read straight out of `process.env` at its point of
 * use, which meant a misconfiguration announced itself as a 500 in the middle of
 * someone's funnel run — or, worse, didn't announce itself at all: `FUNNEL_SECRET`
 * was only checked for being non-empty, so a `.env.local` copied from the template and
 * never edited signed session cookies with the literal string `replace-me`. That is
 * the one thing session.ts exists to prevent, since a guessable signing key lets a
 * visitor mint a verified funnel state for a stranger's phone number.
 *
 * So: parse, don't trust. Each getter memoizes, and `assertServerEnv()` runs the whole
 * set at server start (see src/instrumentation.ts) so a bad deploy fails at boot with
 * every problem listed, rather than failing closed one request at a time.
 *
 * Reads are lazy on purpose. `next build` imports these modules to collect routes, and
 * a build machine legitimately has none of this set when the values are injected at
 * runtime; throwing at import time would break those builds for no reason.
 */

/** The value `.env.example` ships. Signing with it is the same as not signing. */
const PLACEHOLDER_SECRET = "replace-me";

/** 32 hex chars is 16 bytes of entropy — below that an HMAC key is worth brute-forcing.
 *  The template generates 64, which is what a real deployment should have. */
const MIN_SECRET_LENGTH = 32;

const HINT = "copy .env.example to .env.local";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function required(name: string, hint: string): string {
  // Trimmed because `FOO=` and `FOO= ` are both "unset" as far as intent goes, and a
  // stray trailing space in a dashboard's env editor is invisible to whoever typed it.
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`${name} is not set — ${hint}`);
  }
  return raw;
}

let cachedApiUrl: string | undefined;

/**
 * Base URL of the ImageShield /v1 API, with no trailing slash.
 *
 * Renamed from `BACKEND_URL` rather than repointed, and the rename is the warning:
 * the funnel used to talk to the legacy phone-keyed backend, where every request
 * named the user it was acting on. /v1 accepts no identifier as the actor anywhere —
 * the session is the identity. A deployment that still had the old host in
 * `BACKEND_URL` would not have failed loudly against a variable of the same name; it
 * would have 404d its way through a lead's funnel run. So the old name is detected
 * and rejected with a sentence saying what changed.
 *
 * Normalized rather than passed through: callers build request URLs as
 * `${base}${path}`, so a configured value ending in `/` would produce `//v1/quiz`,
 * which some routers treat as a different path and others reject outright.
 */
export function apiBaseUrl(): string {
  if (cachedApiUrl !== undefined) return cachedApiUrl;

  if (!process.env.IMAGESHIELD_API_URL?.trim() && process.env.BACKEND_URL?.trim()) {
    throw new Error(
      "IMAGESHIELD_API_URL is not set, but BACKEND_URL is — the funnel now runs on " +
        "the /v1 API, which is a different service. Set IMAGESHIELD_API_URL to the " +
        "/v1 host (e.g. https://dev.imageshield.com) and remove BACKEND_URL.",
    );
  }

  const raw = required("IMAGESHIELD_API_URL", HINT);

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `IMAGESHIELD_API_URL is not a valid absolute URL (got "${raw}") — it needs a scheme, e.g. https://dev.imageshield.com`,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `IMAGESHIELD_API_URL must be http or https (got "${parsed.protocol}")`,
    );
  }

  // Phone numbers, OTP codes and bearer tokens cross this link. http is tolerable
  // against a localhost API during development and never in production.
  if (isProduction() && parsed.protocol !== "https:") {
    throw new Error(
      "IMAGESHIELD_API_URL must use https in production — OTP codes, phone numbers and session tokens travel over it",
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      "IMAGESHIELD_API_URL must not embed credentials — they would be sent on every request and logged by anything in between",
    );
  }

  if (parsed.search || parsed.hash) {
    throw new Error(
      "IMAGESHIELD_API_URL must not carry a query string or fragment — request paths are appended to it",
    );
  }

  cachedApiUrl = parsed.toString().replace(/\/+$/, "");
  return cachedApiUrl;
}

let cachedSecret: string | undefined;

/** HMAC key for the pre-verification funnel cookie. See session.ts for what it
 *  protects, and why the token cookie beside it needs no signature of its own. */
export function funnelSecret(): string {
  if (cachedSecret !== undefined) return cachedSecret;

  const raw = required(
    "FUNNEL_SECRET",
    `${HINT} and put a long random string in it: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
  );

  if (raw === PLACEHOLDER_SECRET) {
    throw new Error(
      `FUNNEL_SECRET is still the .env.example placeholder ("${PLACEHOLDER_SECRET}") — anyone who has read this repo could forge the contact details a lead's profile is built from`,
    );
  }

  if (raw.length < MIN_SECRET_LENGTH) {
    const problem = `FUNNEL_SECRET is only ${raw.length} characters; use at least ${MIN_SECRET_LENGTH}`;
    if (isProduction()) {
      throw new Error(problem);
    }
    // Left as a warning in development so a scratch value doesn't block local work.
    console.warn(`[env] ${problem}`);
  }

  cachedSecret = raw;
  return cachedSecret;
}

let cachedHops: number | undefined;

/**
 * How many proxies append to `X-Forwarded-For` in front of this app. Defaults to 1.
 *
 * A malformed value throws instead of quietly falling back, which is the behavior
 * change worth noting: `Number("one")` is `NaN`, and the old inline check treated that
 * as "use the default". A typo therefore silently redefined which forwarded entry the
 * per-IP OTP limit trusts — the one thing rate-limit.ts says the cap depends on.
 */
export function trustedProxyHops(): number {
  if (cachedHops !== undefined) return cachedHops;

  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (!raw) {
    cachedHops = 1;
    return cachedHops;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `TRUSTED_PROXY_HOPS must be a non-negative integer (got "${raw}") — leave it unset for the default of 1`,
    );
  }

  cachedHops = parsed;
  return cachedHops;
}

/**
 * Validates everything at once, for the boot-time check.
 *
 * Collects failures rather than throwing on the first, so a fresh deployment with
 * three things missing learns about three things.
 */
export function assertServerEnv(): void {
  const problems: string[] = [];

  for (const check of [apiBaseUrl, funnelSecret, trustedProxyHops]) {
    try {
      check();
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid server environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }
}
