/**
 * The one error envelope the /v1 API answers every failure with:
 *
 *   { "error": "CODE", "message": "...", "retry_after"?: number }
 *
 * Branch on `error`, never on `message` — that is the API's own instruction, and it
 * is what makes this layer possible: the old backend signalled "wrong OTP" with a
 * bare 400 that was indistinguishable from a malformed body, so every caller had to
 * guess from the status alone. Here the code is the diagnosis.
 *
 * Anything that isn't that shape is itself worth naming, so a non-envelope body and
 * a request that never left this server get their own codes rather than being
 * flattened into "something went wrong".
 *
 * Client-safe: the funnel's route handlers translate failures into copy, and the
 * screens need the codes to tell a spent quiz version from a dead session.
 */

export class ApiFailure extends Error {
  constructor(
    /** 0 when the request never reached the API. */
    readonly status: number,
    readonly code: string,
    message: string,
    /** Seconds, from the envelope's `retry_after`. Null when it carried none. */
    readonly retryAfter: number | null,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

export function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type Envelope = { error: string; message: string; retry_after?: unknown };

function asEnvelope(body: unknown): Envelope | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.error !== "string") return null;
  if (typeof candidate.message !== "string") return null;
  return candidate as Envelope;
}

export function failureFrom(status: number, body: unknown): ApiFailure {
  const envelope = asEnvelope(body);
  if (envelope === null) {
    return new ApiFailure(
      status,
      "NON_ENVELOPE_RESPONSE",
      `HTTP ${status} with no error envelope`,
      null,
      body,
    );
  }
  return new ApiFailure(
    status,
    envelope.error,
    envelope.message,
    typeof envelope.retry_after === "number" ? envelope.retry_after : null,
    body,
  );
}

/**
 * Codes whose message describes machinery rather than anything a person can act on
 * — a request that never left this server, or a body that wasn't the envelope.
 */
const OPAQUE = new Set(["TRANSPORT", "NON_ENVELOPE_RESPONSE"]);

/**
 * The API's own message, shaped into a sentence, or the caller's fallback when the
 * failure carries nothing worth showing.
 *
 * Worth preferring over a generic line: these messages are written for people
 * ("could not send the verification email"), and a screen that replaces them with
 * "please try again" tells someone to retry a write that cannot succeed and leaves
 * them assuming they typed something wrong. They arrive uncapitalised and
 * unpunctuated, which is the only reason this is not a plain property read.
 */
export function presentableFailure(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiFailure) || OPAQUE.has(cause.code)) return fallback;
  const message = cause.message.trim();
  if (message === "") return fallback;
  const sentence = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
