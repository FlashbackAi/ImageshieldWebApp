import { backendFetch, BackendError } from "@/lib/api";
import { handoffFor } from "@/lib/handoff";
import { validateAnswers } from "@/lib/quiz";
import { allow } from "@/lib/rate-limit";
import { markVerified, readSession } from "@/lib/session";

type QuizResponse = {
  success: boolean;
  score: number;
  riskLevel: string;
  breakdown: unknown[];
  activeReportsCount: number;
};

/**
 * POST /api/otp/verify — { code, answers }
 *
 * The one place the funnel writes anything. Verifying and saving happen in the same
 * request so there's no window where a half-verified session can write: the phone
 * comes out of the signed cookie, never out of this body.
 *
 * Two writes, both to endpoints the app already uses:
 *   /api/likeness-health-quiz  → scores the answers and stores them on the mobile
 *                                user record, which is what the app reads back.
 *   /updateUserDetails         → the lead's name and email on the web `users` row.
 *
 * Note what is NOT called: /update-profile. It would save the same name and email
 * but also set profileCompleted, and both SplashScreen and OTPScreen in the app read
 * that as "onboarding finished" — a web lead would then skip profile setup entirely.
 */
export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return Response.json(
      { error: "Your code expired. Request a new one." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { code, answers: rawAnswers } = (body ?? {}) as Record<string, unknown>;

  if (typeof code !== "string" || !/^\d{4,8}$/.test(code.trim())) {
    return Response.json({ error: "Enter the code we texted you" }, { status: 400 });
  }

  // Six digits is 1e6 guesses; without this, a script gets there.
  if (!allow(`verify:${session.phone}`, 6, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many wrong codes. Request a new one." },
      { status: 429 },
    );
  }

  const parsedAnswers = validateAnswers(rawAnswers);
  if (!parsedAnswers.ok) {
    return Response.json({ error: parsedAnswers.error }, { status: 400 });
  }

  try {
    await backendFetch("/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: session.phone, otp: code.trim() }),
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 400) {
      return Response.json({ error: "That code isn't right" }, { status: 400 });
    }
    console.error("otp/verify failed", (error as Error).message);
    return Response.json(
      { error: "Couldn't check your code. Please try again." },
      { status: 502 },
    );
  }

  // From here the phone is proven, so the session is upgraded before the writes —
  // if a write fails the user can still land on the result screen and retry.
  await markVerified(session);

  let quiz: QuizResponse;
  try {
    quiz = await backendFetch<QuizResponse>("/api/likeness-health-quiz", {
      method: "POST",
      body: JSON.stringify({
        userPhone: session.phone,
        answers: parsedAnswers.answers,
      }),
    });
  } catch (error) {
    console.error("quiz save failed", (error as Error).message);
    return Response.json(
      { error: "We couldn't save your answers. Please try again." },
      { status: 502 },
    );
  }

  // The lead fields are worth having but not worth failing the funnel over — the
  // score is already saved and the user is waiting on it.
  let leadSaved = true;
  try {
    await backendFetch("/updateUserDetails", {
      method: "POST",
      body: JSON.stringify({
        user_phone_number: session.phone,
        fullName: session.fullName,
        email: session.email,
        leadSource: "web-quiz",
        webQuizCompletedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    leadSaved = false;
    console.error("lead save failed", {
      phone: session.phone,
      message: (error as Error).message,
    });
  }

  return Response.json({
    score: quiz.score,
    riskLevel: quiz.riskLevel,
    breakdown: quiz.breakdown,
    activeReportsCount: quiz.activeReportsCount,
    handoff: handoffFor(session.phone),
    leadSaved,
  });
}
