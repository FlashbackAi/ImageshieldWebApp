import "server-only";

import type { QuizDefinition, QuizQuestion } from "./quiz";
import { ApiFailure } from "./v1/errors";
import { readQuizDefinitionAsUser } from "./v1/quiz";

/**
 * The live quiz, read with the visitor's own session — for the SUBMIT path only.
 *
 * Nothing renders from this. The questions a visitor answers come from
 * `quiz-content.ts`, because they are asked before there is any session and
 * `GET /v1/quiz` answers 401 without one. What this module exists for is the other
 * end: `POST /v1/quiz/responses` validates the answer keys and values against the
 * definition the server is serving right now, so `/api/quiz` re-reads that definition
 * and validates against it before writing.
 *
 * That ordering is the whole point. Checking here means a drifted local quiz becomes
 * a 409 this repo words itself — "the quiz has been updated, please answer it again",
 * with the session left intact — rather than a bare 400 from the API after the write
 * was attempted.
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
 * Only for logging, but worth watching: this firing means `quiz-content.ts` has fallen
 * behind the server, and it is the earliest warning of that. Whether those particular
 * answers survive is still decided by validating them, not by comparing version
 * strings — a version can move without any question this repo renders having changed.
 */
export function noteVersionDrift(answeredVersion: unknown, live: QuizDefinition): void {
  if (typeof answeredVersion !== "string") return;
  if (answeredVersion === live.quiz_version) return;
  console.warn(
    `[quiz] answers were given against ${answeredVersion} but the live definition is ${live.quiz_version}`,
  );
}
