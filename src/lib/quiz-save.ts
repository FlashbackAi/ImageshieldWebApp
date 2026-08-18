import "server-only";

import { backendFetch } from "./api";
import { splitName } from "./contact";
import type { QuizAnswers } from "./quiz";
import type { FunnelSession } from "./session";

/**
 * The funnel's two writes onto the shared user record — the score, and the lead
 * behind it.
 *
 * They live here rather than inside `/api/otp/verify` because the verify request is
 * no longer the only place they happen. `/verify-otp` clears the stored code the
 * moment it accepts one (server.js `saveMobileOTP` sets `otp: null`), so a code is
 * good exactly once: if the write after it fails, re-sending the same six digits
 * cannot possibly work. `/api/quiz` retries the write against the already-verified
 * session instead, and both routes go through these two functions so there is one
 * definition of what the funnel puts on the record.
 */
export type QuizSaved = {
  score: number;
  riskLevel: string;
  breakdown: unknown[];
  activeReportsCount: number;
};

type QuizResponse = QuizSaved & { success: boolean };

/**
 * Scores the answers onto the mobile user record, which is what the app reads back.
 *
 * Throws on failure — what that costs the user is the caller's call, and it differs:
 * mid-verify it is a 502 the client can retry, in `/api/quiz` it is the whole
 * request.
 */
export async function saveQuizAnswers(
  phone: string,
  answers: QuizAnswers,
): Promise<QuizSaved> {
  const quiz = await backendFetch<QuizResponse>("/api/likeness-health-quiz", {
    method: "POST",
    // Bare, no `+`, exactly as the app's quizSync posts it. The backend puts the
    // `+` back either way; sending the same bytes keeps the two clients from
    // drifting apart if that ever stops being true.
    body: JSON.stringify({
      userPhone: phone.replace(/\+/g, ""),
      answers,
    }),
  });

  return {
    score: quiz.score,
    riskLevel: quiz.riskLevel,
    breakdown: quiz.breakdown,
    activeReportsCount: quiz.activeReportsCount,
  };
}

/**
 * The lead's name and email, onto the same record.
 *
 * Never fatal, and deliberately attempted BEFORE the score: the score can be retried
 * from the client afterwards, but the name and email only exist in the session cookie
 * for as long as that cookie does. Saving them first means a backend blip on the
 * quiz write costs the lead nothing.
 *
 * `/update-profile` also sets `profileCompleted: true`, and the app treats that as
 * "onboarding finished" (SplashScreen line 114, OTPScreen line 152). So a lead who
 * came through the web and later installs the app lands on the Dashboard without
 * being asked for a selfie, and has to add one from Settings. That is a known and
 * accepted trade for capturing the lead against the record the app actually reads —
 * the alternative was a mobile-side change to also require `selfieUploaded`.
 *
 * Returns whether it landed, which the verify response passes back for whoever is
 * counting leads.
 */
export async function saveLead(session: FunnelSession): Promise<boolean> {
  try {
    const { firstName, lastName } = splitName(session.fullName);
    await backendFetch("/update-profile", {
      method: "POST",
      /* Exactly the fields ProfileSetupScreen sends, and no more. The handler also
         destructures `employer` and `school`, so leaving them off spreads them in
         as undefined over the existing record — whatever that does to an app user
         who had filled them in, it already does when they edit their name in the
         app (PersonalInfoScreen omits them too). Matching the app's payload keeps
         the web from being the odd one out; it does not fix that. */
      body: JSON.stringify({
        phone: session.phone,
        firstName,
        lastName,
        email: session.email,
        fullName: session.fullName,
      }),
    });
    return true;
  } catch (error) {
    console.error("lead save failed", {
      phone: session.phone,
      message: (error as Error).message,
    });
    return false;
  }
}
