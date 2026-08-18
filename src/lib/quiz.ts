/**
 * The quiz, mirrored from the app's LikenessHealthQuizScreen.
 *
 * These ids and option strings are not cosmetic: the backend scores them by exact
 * match (`answers.gender === 'Female'` → −5) and falls back to a middling default
 * for anything it doesn't recognise. Rename an option here and the score silently
 * stops meaning anything. Keep this file and STEPS in the app in lockstep.
 *
 * Client-safe on purpose — the screens render from it and the route handlers
 * validate against it, so there's exactly one definition of what a valid answer is.
 */
export type QuizQuestion = {
  id: string;
  label: string;
  question: string;
  hint?: string;
  multi?: boolean;
  /** Only asked when pastExploitation === 'Yes', same as the app. */
  conditional?: boolean;
  options: readonly string[];
};

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "age",
    label: "LIKENESS HEALTH QUIZ (1/7)",
    // Typographic apostrophe: it's what the design draws, and it's only ever
    // displayed — the backend matches on `id` and the option strings, not this.
    question: "What’s your age?",
    options: ["Under 21", "21-30", "31-50", "Over 50"],
  },
  {
    id: "gender",
    label: "LIKENESS HEALTH QUIZ (2/7)",
    question: "What is your gender?",
    options: ["Female", "Male", "Non-Binary", "Prefer not to say"],
  },
  {
    id: "platforms",
    label: "LIKENESS HEALTH QUIZ (3/7)",
    question: "Which platforms do you use?",
    hint: "Select all that apply",
    multi: true,
    options: [
      "X (Twitter)",
      "Snapchat",
      "Instagram",
      "Facebook",
      "TikTok",
      "YouTube",
    ],
  },
  {
    id: "visibility",
    label: "LIKENESS HEALTH QUIZ (4/7)",
    question: "What are your account privacy settings?",
    options: ["Public", "Private"],
  },
  {
    id: "contentType",
    label: "LIKENESS HEALTH QUIZ (5/7)",
    question: "What type of content do you typically share?",
    options: ["Regular content", "Sensitive content", "Adult content"],
  },
  {
    id: "contentQuantity",
    label: "LIKENESS HEALTH QUIZ (6/7)",
    question: "How much content do you post online?",
    options: ["Minimal", "Moderate", "High"],
  },
  {
    id: "pastExploitation",
    label: "LIKENESS HEALTH QUIZ (7/7)",
    question: "Have your photos or likeness ever been misused before?",
    options: ["No", "Yes"],
  },
  {
    id: "confirmedTakedown",
    label: "LIKENESS HEALTH QUIZ (8/8)",
    question: "Have you had confirmed content takedowns?",
    conditional: true,
    options: ["No", "Yes"],
  },
] as const;

export type QuizAnswers = Record<string, string | string[]>;

/** The app skips this question unless the answer before it was 'Yes'. */
export function isAsked(question: QuizQuestion, answers: QuizAnswers): boolean {
  return !question.conditional || answers.pastExploitation === "Yes";
}

/** Questions still unanswered — drives the Continue button and the server check. */
export function missingAnswers(answers: QuizAnswers): string[] {
  return QUIZ_QUESTIONS.filter((q) => {
    if (!isAsked(q, answers)) return false;
    const given = answers[q.id];
    return q.multi ? !Array.isArray(given) || !given.length : !given;
  }).map((q) => q.id);
}

/**
 * Sanitise answers before they reach the shared user record.
 *
 * The record is the same one the app reads, so anything accepted here shows up in
 * the app's score detail screen. Unknown keys and off-menu values are dropped
 * rather than trusted — a browser POST is not a trusted source.
 */
export function validateAnswers(
  raw: unknown,
): { ok: true; answers: QuizAnswers } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "answers must be an object" };
  }
  const input = raw as Record<string, unknown>;
  const answers: QuizAnswers = {};

  for (const q of QUIZ_QUESTIONS) {
    const given = input[q.id];
    if (given === undefined || given === null) continue;

    if (q.multi) {
      if (!Array.isArray(given)) {
        return { ok: false, error: `${q.id} must be a list` };
      }
      const picked = given.filter(
        (v): v is string => typeof v === "string" && q.options.includes(v),
      );
      if (picked.length !== given.length) {
        return { ok: false, error: `${q.id} has an unknown option` };
      }
      if (picked.length) answers[q.id] = picked;
      continue;
    }

    if (typeof given !== "string" || !q.options.includes(given)) {
      return { ok: false, error: `${q.id} has an unknown option` };
    }
    answers[q.id] = given;
  }

  const missing = missingAnswers(answers);
  if (missing.length) {
    return { ok: false, error: `unanswered: ${missing.join(", ")}` };
  }

  return { ok: true, answers };
}
