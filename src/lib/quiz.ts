/**
 * The shape of a quiz, and the rules for handling answers to one.
 *
 * Not the questions themselves — those come from `GET /v1/quiz`, read without a
 * session for the screens and with one at submit. This file is what both ends agree on.
 *
 * Everything here takes the definition as an argument rather than reaching for one,
 * and that is deliberate: `/api/quiz` runs these same functions against a definition
 * it re-read itself, while the screens run them against the one they rendered from.
 * Those are normally the same bytes, and when a deploy lands mid-funnel they are not —
 * which is exactly how the mismatch gets caught instead of becoming a 400.
 *
 * Client-safe on purpose — the screens import it directly.
 */

export type QuizQuestion = {
  /** The answer key. `answers` is an object keyed by these. */
  key: string;
  prompt: string;
  options: readonly string[];
  /** Multi-select: the answer is an array of options rather than one. */
  multi?: boolean;
  /** False for a question that is asked but doesn't move the score. */
  scored?: boolean;
  /** False for a question the visitor may leave blank. Absent means required —
   *  the live definition only sets it on `platforms`, and only to false. */
  required?: boolean;
  /**
   * The definition's conditional unlock — sent by the server, IGNORED by this client.
   *
   * The quiz is asked as one fixed sequence now: every question the definition lists
   * is rendered, in the order it lists them, whatever else has been answered. The
   * live definition still carries this on `discovery_method`, so it stays on the type
   * — a shape that omitted it would make `parseDefinition` look like it had checked a
   * field it never saw — but nothing here reads it. See `askedQuestions`.
   */
  requires?: { key: string; value?: string; values?: readonly string[] };
};

export type QuizDefinition = {
  /** Pins answers to the definition they were answered against. Never invented. */
  quiz_version: string;
  questions: readonly QuizQuestion[];
};

export type QuizAnswers = Record<string, string | string[]>;

/** The API's own caps on an answer. Checked here so the copy is ours, not a 400. */
const MAX_VALUE_LENGTH = 200;
const MAX_SELECTIONS = 50;

/**
 * The questions being asked: all of them, in the order the definition lists them.
 *
 * This used to filter on `requires`, so a question joined the sequence only once
 * another answer unlocked it. The quiz is no longer asked that way — the sequence is
 * fixed, and `discovery_method` is question 6 of 6 for everyone rather than a question
 * only the visitors who reported prior misuse ever reach.
 *
 * Still a function rather than `definition.questions` inlined at the call sites, and
 * the reason is the step count. Three places count these — the `(3/6)` label, "is this
 * the last question", and whether stored answers cover the quiz — and they have to
 * agree with each other and with what `/api/quiz` validates. One definition of "the
 * questions" is what keeps them agreeing, and one place to change if unlocks return.
 */
export function askedQuestions(definition: QuizDefinition): QuizQuestion[] {
  return [...definition.questions];
}

/** Questions still unanswered — drives the Continue button and the server check. */
export function missingAnswers(
  definition: QuizDefinition,
  answers: QuizAnswers,
): string[] {
  return askedQuestions(definition)
    .filter((q) => {
      /* `required: false` is the server saying this one may be skipped, and the
         live `platforms` question carries it. Treating every asked question as
         mandatory held Continue disabled on a question the API would have
         accepted empty — a dead end with nothing on screen explaining it. */
      if (q.required === false) return false;
      const given = answers[q.key];
      return q.multi
        ? !Array.isArray(given) || given.length === 0
        : typeof given !== "string" || given === "";
    })
    .map((q) => q.key);
}

/**
 * Sanitise answers before they reach the API.
 *
 * The API validates them too, and would be within its rights to be the only thing
 * that does. This runs anyway because of where `/api/quiz` runs it — against the live
 * definition, before the write — which is what turns a drifted local quiz from a bare
 * "400 VALIDATION_FAILED" into a sentence naming the question and a screen that sends
 * the visitor back to answer it.
 *
 * Unknown keys are dropped rather than forwarded, off-menu values are refused.
 */
export function validateAnswers(
  definition: QuizDefinition,
  raw: unknown,
): { ok: true; answers: QuizAnswers } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "answers must be an object" };
  }
  const input = raw as Record<string, unknown>;
  const answers: QuizAnswers = {};

  for (const question of definition.questions) {
    const given = input[question.key];
    if (given === undefined || given === null) continue;

    if (question.multi) {
      if (!Array.isArray(given)) {
        return { ok: false, error: `${question.key} must be a list` };
      }
      if (given.length > MAX_SELECTIONS) {
        return { ok: false, error: `${question.key} has too many selections` };
      }
      const picked = given.filter(
        (v): v is string =>
          typeof v === "string" && question.options.includes(v),
      );
      if (picked.length !== given.length) {
        return { ok: false, error: `${question.key} has an unknown option` };
      }
      if (picked.length > 0) answers[question.key] = picked;
      continue;
    }

    if (
      typeof given !== "string" ||
      given.length > MAX_VALUE_LENGTH ||
      !question.options.includes(given)
    ) {
      return { ok: false, error: `${question.key} has an unknown option` };
    }
    answers[question.key] = given;
  }

  /* There is no second pass dropping answers here any more. It existed for closed
     conditionals — switching an earlier answer could hide a question already answered,
     and its answer outlived the question in sessionStorage — and with every question
     always asked, nothing can go stale that way. The loop above is the only filter
     left, and it builds `answers` from the definition's own keys, so a key the server
     does not serve cannot reach the write regardless. */
  const missing = missingAnswers(definition, answers);
  if (missing.length > 0) {
    return { ok: false, error: `unanswered: ${missing.join(", ")}` };
  }

  return { ok: true, answers };
}

/**
 * Whether a visitor still has quiz left to do — the guard every screen after the
 * quiz runs before it lets someone stand on it. The details form is the first of
 * them, which is what stops anyone spending a code on a score they never earned.
 *
 * A version mismatch counts as incomplete, and that is the part worth spelling out:
 * answers stored against a version this tab no longer renders are complete answers to
 * questions that are no longer being asked. Treating them as done would carry them all
 * the way to `POST /v1/quiz/responses`, which rejects them.
 */
export function quizIncomplete(
  definition: QuizDefinition,
  state: { answers: QuizAnswers; quizVersion?: string },
): boolean {
  if (state.quizVersion !== definition.quiz_version) return true;
  return missingAnswers(definition, state.answers).length > 0;
}
