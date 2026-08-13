/**
 * The funnel as data.
 *
 * Designers reorder these screens constantly. Keep the order in this one array and
 * derive next/prev from it — never hardcode "after OTP comes the quiz" in a screen.
 */
export const FUNNEL_STEPS = [
  "landing",
  "quiz",
  "phone",
  "otp",
  "calculating",
  "score",
  "open-app",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const STEP_PATHS: Record<FunnelStep, string> = {
  landing: "/",
  quiz: "/quiz",
  phone: "/phone",
  otp: "/otp",
  calculating: "/calculating",
  score: "/score",
  "open-app": "/open-app",
};

export function nextStep(step: FunnelStep): FunnelStep | null {
  return FUNNEL_STEPS[FUNNEL_STEPS.indexOf(step) + 1] ?? null;
}

export function prevStep(step: FunnelStep): FunnelStep | null {
  const i = FUNNEL_STEPS.indexOf(step);
  return i > 0 ? FUNNEL_STEPS[i - 1] : null;
}

export function nextPath(step: FunnelStep): string | null {
  const next = nextStep(step);
  return next ? STEP_PATHS[next] : null;
}

/** 0–1, for the progress bar at the top of every screen. */
export function progressAt(step: FunnelStep): number {
  return (FUNNEL_STEPS.indexOf(step) + 1) / FUNNEL_STEPS.length;
}
