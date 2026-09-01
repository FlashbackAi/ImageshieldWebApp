import "server-only";

import type { QuizDefinition, QuizQuestion } from "./quiz";
import { ApiFailure } from "./v1/errors";
import { readPublicQuizDefinition, readQuizDefinitionAsUser } from "./v1/quiz";

/**
 * The quiz definition, read two ways for two different jobs.
 *
 * `readVisitorQuizDefinition` is what the SCREENS render from, read without a session
 * because the funnel asks the quiz before the phone number. `readLiveQuizDefinition`
 * is what the SUBMIT validates against, read with the visitor's own session.
 *
 * Both hit `GET /v1/quiz`, so they normally return the same bytes and the second read
 * looks redundant. It is not, and the case it exists for is a deploy that lands while
 * someone is mid-quiz: `POST /v1/quiz/responses` validates keys and values against
 * whatever is active at that instant, so `/api/quiz` re-reads it and compares. That
 * turns a mismatch into a 409 this repo words itself — "the quiz has been updated,
 * please answer it again", with the session left intact — rather than a bare 400 from
 * the API after the write was attempted.
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
 * Throws rather than returning null: a submit is not allowed to proceed on a
 * definition it could not read. Re-reading it here rather than trusting the version
 * the client sent is what pins the answers to what the server is serving now — the
 * client's copy is this repo's own and is exactly the thing being checked.
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
 * Only for logging, but worth watching. Both reads hit the same endpoint, so this
 * firing means the definition CHANGED between the questions being fetched and the
 * answers being sent — a deploy mid-funnel, or a tab left open past one. Whether those
 * particular answers survive is still decided by validating them, not by comparing
 * version strings: a version can move without any question having changed.
 */
export function noteVersionDrift(answeredVersion: unknown, live: QuizDefinition): void {
  if (typeof answeredVersion !== "string") return;
  if (answeredVersion === live.quiz_version) return;
  console.warn(
    `[quiz] answers were given against ${answeredVersion} but the live definition is ${live.quiz_version}`,
  );
}

/**
 * The quiz for a visitor who has not verified anything yet.
 *
 * Returns null rather than throwing, because the caller is a screen: an unreadable
 * definition is a "try again" on the first question, which is the cheapest place in
 * the funnel to fail. Throwing would be a 500 on a route that has nothing private on
 * it, and — as the outage that preceded this work showed — a 500 here reads to a
 * visitor as the whole site being broken.
 *
 * There is deliberately NO bundled fallback. Rendering questions the server does not
 * have produces answers it refuses at the very END of the quiz, after all the
 * visitor's work; failing on the first screen with a retry is the kinder failure. The
 * app's `useQuizDefinition` makes the same call for the same reason.
 */
export async function readVisitorQuizDefinition(): Promise<QuizDefinition | null> {
  try {
    return parseDefinition(await readPublicQuizDefinition());
  } catch (error) {
    console.error("public quiz definition unavailable", (error as Error).message);
    return null;
  }
}
