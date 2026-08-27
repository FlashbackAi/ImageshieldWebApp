/**
 * The /v1 transport. One place decides headers, what a failure becomes, and when a
 * 409 is worth waiting out — so no call site has to.
 *
 * Browsers never reach the API directly. Route handlers under src/app/api/ call
 * this, which is what keeps the OTP send policy, the tokens and the abuse rules on
 * this side of the wire instead of being re-implemented (and bypassable) in a
 * client bundle.
 *
 * Deliberately NOT a session-aware client. Refreshing a /v1 session ROTATES the
 * refresh token, so the new pair has to be written back to a cookie — and cookies
 * can only be set from a route handler or a server function, never from a server
 * component's render. Mixing that into the transport would put a silent, unwritable
 * token rotation behind every call. Session handling therefore lives in session.ts,
 * which owns the cookie and calls this.
 */
import "server-only";

import { apiBaseUrl } from "../env";
import { ApiFailure, failureFrom, parseBody } from "./errors";

const NO_CONTENT = 204;
const CONFLICT = 409;

/** A 409 that names its own wait is the API asking us back, not a refusal. */
const MAX_CONFLICT_RETRIES = 3;

/** Never sleep longer than this on one retry, whatever the API asks for — a route
 *  handler holding a request open is a user staring at a spinner. */
const MAX_RETRY_WAIT_S = 5;

export type CallOptions = {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Omitted or null sends the request unauthenticated. */
  accessToken?: string | null;
  /**
   * Set ONLY when the endpoint asks for one. The writes with real side effects
   * (subscribe, consent, invites, photo commit) require it and 400 without it —
   * but `POST /v1/enrolment/sessions` REJECTS it, so a transport that attached one
   * globally would break that route. Nothing the funnel calls needs it today.
   */
  idempotencyKey?: string;
  retryConflict?: boolean;
};

function withQuery(
  path: string,
  query: CallOptions["query"],
): string {
  if (query === undefined) return path;
  const parts = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) parts.set(key, String(value));
  }
  const encoded = parts.toString();
  return encoded === "" ? path : `${path}?${encoded}`;
}

const sleep = (ms: number) =>
  new Promise<void>((done) => setTimeout(done, ms));

/**
 * Sends one request and turns the answer into either a parsed body or an
 * `ApiFailure`.
 *
 * Returns `undefined` on 204, which is what `DELETE /v1/me` and the revocations
 * answer — `res.json()` on an empty body throws, and that throw would be reported
 * as a transport fault on a request that in fact succeeded.
 */
export async function call<T>(
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<T> {
  const url = `${apiBaseUrl()}${withQuery(path, options.query)}`;

  for (let attempt = 0; ; attempt += 1) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
        /* NOTHING on this API is cached, and there is no option to opt out of that.
           Every response is either a write or answered for whoever the bearer token
           belongs to — including the quiz definition, which is the same bytes for
           everyone but is fetched with an Authorization header. A cache entry keyed
           loosely enough to be shared would be one visitor's authenticated response
           served to another, and the saving would be kilobytes. */
        cache: "no-store",
      });
    } catch (cause) {
      const why =
        cause instanceof Error
          ? cause.message
          : "the request never reached the API";
      throw new ApiFailure(0, "TRANSPORT", why, null, null);
    }

    if (response.status === NO_CONTENT) return undefined as T;

    const body = parseBody(await response.text());
    if (response.ok) return body as T;

    const failure = failureFrom(response.status, body);

    const worthRetrying =
      options.retryConflict === true &&
      response.status === CONFLICT &&
      failure.retryAfter !== null &&
      attempt < MAX_CONFLICT_RETRIES;
    if (!worthRetrying) throw failure;

    await sleep(Math.min(failure.retryAfter!, MAX_RETRY_WAIT_S) * 1000);
  }
}
