/**
 * The funnel as data.
 *
 * Designers reorder these screens constantly. Keep the order in this one array and
 * derive next/prev from it — never hardcode "after OTP comes the quiz" in a screen.
 */
const FUNNEL_STEPS = [
  "landing",
  "quiz",
  "details",
  "otp",
  "quiz-questions",
  "calculating",
  "score",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const STEP_PATHS: Record<FunnelStep, string> = {
  landing: "/",
  /* "Take the Quiz" lands on the intro: marketing copy explaining what the quiz is.
     No API behind it, which is why it stays in front of the form. */
  quiz: "/quiz",
  /* Full name, email, phone. Submitting it sends the code. */
  details: "/details",
  otp: "/otp",
  /* The questions themselves, and the reason the order is what it is: they are
     rendered from `GET /v1/quiz`, which the API answers only to a session. Asking
     them after sign-in is what lets the funnel read the live definition instead of
     guessing at one — and answers to a guessed quiz are rejected at submit, which
     would fail at the END of the funnel rather than the start. */
  "quiz-questions": "/quiz/questions",
  /* Where the answers are actually submitted and the score computed. It is a real
     wait now, not a staged one: the phone number is already verified by this point,
     so there is a session to write with. */
  calculating: "/calculating",
  /* Score, QR and the store links: one screen, fed by /api/score. */
  score: "/score",
};

/**
 * Steps that move on by themselves.
 *
 * They are legitimate forward destinations but never back ones: landing on the
 * loader again just runs its timer and pushes the user straight back where they
 * came from, so a "Back" button pointing at one does nothing but flash.
 */
const AUTO_ADVANCING: ReadonlySet<FunnelStep> = new Set(["calculating"]);

function nextStep(step: FunnelStep): FunnelStep | null {
  return FUNNEL_STEPS[FUNNEL_STEPS.indexOf(step) + 1] ?? null;
}

function prevStep(step: FunnelStep): FunnelStep | null {
  const i = FUNNEL_STEPS.indexOf(step);
  return i > 0 ? FUNNEL_STEPS[i - 1] : null;
}

export function nextPath(step: FunnelStep): string | null {
  const next = nextStep(step);
  return next ? STEP_PATHS[next] : null;
}

/** Where a "Back" control on `step` should go — the nearest step the user can act on. */
export function backPath(step: FunnelStep): string | null {
  let prev = prevStep(step);
  while (prev && AUTO_ADVANCING.has(prev)) prev = prevStep(prev);
  return prev ? STEP_PATHS[prev] : null;
}
