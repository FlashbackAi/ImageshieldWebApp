import "server-only";

import type { QuizDefinition, QuizQuestion } from "./quiz";
import { ApiFailure } from "./v1/errors";
import { readQuizDefinitionAsUser } from "./v1/quiz";

/**
 * The active quiz, read with the visitor's own session.
 *
 * There is one source and no fallback, and that is a consequence of where the quiz
 * sits in the funnel: the questions are asked after the phone number is verified, so
 * every screen that needs them already has a session and can read the live definition.
 *
 * It was not always so. While the quiz came first, this had to serve anonymous
 * visitors from a committed snapshot, because `GET /v1/quiz` answers 401 without a
 * session — the app and the deployed web client both read the quiz from inside an
 * already-authenticated onboarding flow, so nothing had needed it open. Moving the
 * questions behind sign-in removed the need for the snapshot, the capture tool that
 * produced it, and the drift it could develop against the server.
 *
 * What has not changed is the rule the snapshot existed to respect: nothing here
 * invents a question. A hardcoded quiz would render and then be rejected at submit —
 * `POST /v1/quiz/responses` validates both the answer keys and the answer values
 * against the active definition — failing at the end of the funnel instead of the
 * start, after the visitor had given up their number and spent a code.
 */

/** Shape-checked rather than trusted: a malformed response should degrade to the
 *  unavailable screen, not crash a render halfway through the funnel. */
function parseDefinition(value: unknown): QuizDefinition | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.quiz_version !== "string" || candidate.quiz_version === "") {
    return null;
  }
  if (!Array.isArray(candidate.questions) || candidate.questions.length === 0) {
    return null;
  }

  for (const raw of candidate.questions) {
    if (typeof raw !== "object" || raw === null) return null;
    const q = raw as Record<string, unknown>;
    if (typeof q.key !== "string" || q.key === "") return null;
    if (typeof q.prompt !== "string") return null;
    if (
      !Array.isArray(q.options) ||
      q.options.length === 0 ||
      !q.options.every((o) => typeof o === "string")
    ) {
      return null;
    }
  }

  return {
    quiz_version: candidate.quiz_version,
    questions: candidate.questions as QuizQuestion[],
  };
}

/**
 * For rendering. Null when the definition can't be read, at which point the screen
 * shows `QuizUnavailable` — there is nothing useful to draw without the questions.
 *
 * `SessionUnavailable` is deliberately NOT swallowed: a visitor who has lost their
 * session should be sent back to the start of the funnel by the page, not shown a
 * screen implying the quiz itself is broken.
 */
export async function loadQuizDefinition(): Promise<QuizDefinition | null> {
  let body: unknown;
  try {
    body = await readQuizDefinitionAsUser();
  } catch (error) {
    /* Only the API refusing becomes `null`. Anything else — a lost session, or Next
       signalling that a route can't be prerendered by throwing from its own request
       APIs — belongs to the caller. A catch-all here turned that second one into a
       permanently unavailable quiz screen. */
    if (!(error instanceof ApiFailure)) throw error;
    console.error("[quiz] definition unavailable", error.code, error.message);
    return null;
  }

  const definition = parseDefinition(body);
  if (definition === null) {
    console.error("[quiz] GET /v1/quiz returned a body that is not a definition");
  }
  return definition;
}

/**
 * For writing. Throws rather than returning null: a submit is not allowed to proceed
 * on a definition it could not read, and re-reading it here rather than trusting what
 * a screen rendered is what pins the answers to the version the server is serving now.
 */
export async function readLiveQuizDefinition(): Promise<QuizDefinition> {
  const definition = parseDefinition(await readQuizDefinitionAsUser());
  if (definition === null) {
    throw new ApiFailure(
      200,
      "NON_ENVELOPE_RESPONSE",
      "GET /v1/quiz returned a body that is not a definition",
      null,
      null,
    );
  }
  return definition;
}

/**
 * Whether what the visitor answered has since drifted from what the server serves.
 *
 * Only for logging. The questions are now read moments before they are answered, so
 * this needs a quiz edited mid-session to fire at all — and whether those particular
 * answers survive is decided by validating them, not by comparing version strings.
 */
export function noteVersionDrift(answeredVersion: unknown, live: QuizDefinition): void {
  if (typeof answeredVersion !== "string") return;
  if (answeredVersion === live.quiz_version) return;
  console.warn(
    `[quiz] answers were given against ${answeredVersion} but the live definition is ${live.quiz_version}`,
  );
}
