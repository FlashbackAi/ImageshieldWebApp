import type { QuizDefinition } from "./quiz";

/**
 * The quiz, carried by this repo.
 *
 * The funnel asks the questions BEFORE the visitor verifies a phone number, and
 * `GET /v1/quiz` is answered only to a session — so at the moment these are rendered
 * there is no token to read them with. A local copy is the only way the questions can
 * come first, and the order is a conversion decision: a visitor who has already
 * answered eight questions has a reason to hand over their number, and one who is
 * asked for it cold does not.
 *
 * Captured from a real `GET /v1/quiz` response on 2026-08-27 — the server's own keys,
 * prompts and option strings, not invented ones. That distinction is the whole safety
 * story here, because it is not this file that decides whether an answer is valid:
 * `POST /v1/quiz/responses` validates the answer KEYS and the answer VALUES against
 * whatever definition the server is serving at submit time, and 400s on anything it
 * doesn't recognise.
 *
 * So the risk this file carries is drift, and it is worth naming precisely. If the
 * server edits a question, these answers are rejected — and now that the questions
 * come first, that rejection lands AFTER the visitor has verified. It is not a dead
 * end: `/api/quiz` re-reads the live definition, spots the mismatch and answers 409
 * with `retakeQuiz`, and the screens send the visitor back to the questions with
 * their session intact. They answer again; they do not get texted a second code.
 *
 * Keeping that path rare is a matter of keeping this file current:
 *
 *   1. `POST /v1/auth/otp`, verify, then `GET /v1/quiz` with the bearer token.
 *   2. Paste `quiz_version` and `questions` here, and into tools/dev-api/quiz.json.
 *
 * `[quiz] answers were given against X but the live definition is Y` in the server
 * log is this file having gone stale — see `noteVersionDrift`.
 *
 * Client-safe: the quiz screens import it directly, which is why it holds no secrets
 * and does no I/O.
 */
export const QUIZ: QuizDefinition = {
  quiz_version: "likeness-health-v2",
  questions: [
    {
      key: "age",
      prompt: "What is your age?",
      scored: true,
      options: ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"],
    },
    {
      key: "gender",
      prompt: "What is your gender?",
      scored: true,
      options: ["Female", "Non-Binary", "Prefer not to say", "Male"],
    },
    {
      key: "platforms",
      prompt: "Which platforms do you use?",
      scored: true,
      multi: true,
      /* The one question the server lets a visitor leave blank, and the flag is the
         server's, not a preference of ours — dropping it would hold Continue disabled
         on an answer `POST /v1/quiz/responses` would have accepted empty. */
      required: false,
      options: [
        "Instagram",
        "TikTok",
        "Snapchat",
        "X (Twitter)",
        "Facebook",
        "YouTube",
      ],
    },
    {
      key: "privacy",
      prompt: "Are your accounts public or private?",
      scored: true,
      options: ["Public", "Private"],
    },
    {
      key: "content_type",
      prompt: "What kind of content do you share?",
      scored: true,
      options: ["Regular content", "Sensitive content", "Adult content"],
    },
    {
      key: "posting_volume",
      prompt: "How much do you post?",
      scored: true,
      options: ["Minimal", "Moderate", "High"],
    },
    {
      key: "prior_misuse",
      prompt: "Has your likeness been misused online before?",
      scored: true,
      options: ["No", "Yes"],
    },
    {
      key: "monitoring",
      prompt:
        "How do you monitor whether your likeness is being misused online?",
      scored: true,
      options: [
        "I use a service that monitors my photos",
        "I rely on friends and family to tell me",
        "I don't monitor",
      ],
    },
  ],
};
