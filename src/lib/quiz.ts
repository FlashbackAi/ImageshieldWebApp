/**
 * The quiz, as the server defines it.
 *
 * This file used to BE the quiz: eight questions and their option strings, mirrored
 * by hand from the app's `LikenessHealthQuizScreen`, with a comment warning that
 * renaming an option would silently stop the score meaning anything. On /v1 that
 * warning became an error message — `POST /v1/quiz/responses` validates both the
 * answer KEYS and the VALUES against the active definition and rejects anything it
 * doesn't recognise with a 400. So the questions are read from `GET /v1/quiz` and
 * this file is only the shapes and the rules for handling them.
 *
 * Client-safe on purpose: the screens render from these types and the route handlers
 * validate against them, so there is exactly one definition of what a valid answer is.
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
  /** Asked only when another answer took a particular value. */
  requires?: { key: string; value: string };
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
 * Whether a question is on the table given what has been answered so far.
 *
 * A `requires` against a multi-select is satisfied by the value being among the
 * picks, not by the whole answer equalling it — same rule the app and the deployed
 * web client both apply.
 */
function isAsked(question: QuizQuestion, answers: QuizAnswers): boolean {
  if (question.requires === undefined) return true;
  const given = answers[question.requires.key];
  if (typeof given === "string") return given === question.requires.value;
  if (Array.isArray(given)) return given.includes(question.requires.value);
  return false;
}

/** The questions actually being asked — conditionals join as they unlock. */
export function askedQuestions(
  definition: QuizDefinition,
  answers: QuizAnswers,
): QuizQuestion[] {
  return definition.questions.filter((q) => isAsked(q, answers));
}

/** Questions still unanswered — drives the Continue button and the server check. */
export function missingAnswers(
  definition: QuizDefinition,
  answers: QuizAnswers,
): string[] {
  return askedQuestions(definition, answers)
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
 * that does. This runs anyway for one reason: it turns "400 VALIDATION_FAILED" into
 * a sentence naming the question, and it catches a stale tab — answers left in
 * sessionStorage against a definition the server has since edited — before it costs
 * the visitor a round trip and a failed-looking screen.
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

  const missing = missingAnswers(definition, answers);
  if (missing.length > 0) {
    return { ok: false, error: `unanswered: ${missing.join(", ")}` };
  }

  return { ok: true, answers };
}

/**
 * Whether a visitor still has quiz left to do — the guard every screen after the
 * quiz runs before it lets someone stand on it.
 *
 * A version mismatch counts as incomplete, and that is the part worth spelling out:
 * answers stored against a retired definition are complete answers to questions that
 * are no longer being asked. Treating them as done would carry them all the way to
 * `POST /v1/quiz/responses`, which rejects them — after the visitor has entered their
 * phone number and spent a code.
 */
export function quizIncomplete(
  definition: QuizDefinition,
  state: { answers: QuizAnswers; quizVersion?: string },
): boolean {
  if (state.quizVersion !== definition.quiz_version) return true;
  return missingAnswers(definition, state.answers).length > 0;
}
