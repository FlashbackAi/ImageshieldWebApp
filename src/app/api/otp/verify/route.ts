import { backendFetch, BackendError } from "@/lib/api";
import { handoffFor } from "@/lib/handoff";
import { validateAnswers } from "@/lib/quiz";
import { saveLead, saveQuizAnswers } from "@/lib/quiz-save";
import { allow } from "@/lib/rate-limit";
import { markVerified, readSession } from "@/lib/session";

type CheckUser = {
  registered: boolean;
  selfieUploaded: boolean;
  profileCompleted: boolean;
  consentSigned: boolean;
};

/**
 * POST /api/otp/verify — { code, answers }
 *
 * Verifying and saving happen in the same request so there's no window where a
 * half-verified session can write: the phone comes out of the signed cookie, never
 * out of this body.
 *
 * The calls, and their order, are the app's own onboarding sequence (OTPScreen →
 * ProfileSetupScreen), against the same endpoints:
 *
 *   /verify-otp                → marks the record `registered`, same as the app, and
 *                                clears the stored code, so it accepts each one once.
 *   /check-user                → what the app asks next. Nothing here branches on
 *                                it, but it is what fires the backend's `check_user`
 *                                activity log, so web sign-ins show up in the same
 *                                analytics as app ones.
 *   /update-profile            → the lead's name and email.
 *   /api/likeness-health-quiz  → scores the answers onto the mobile user record,
 *                                which is what the app reads back.
 *
 * The lead goes in before the score, which is the reverse of how this read at first.
 * The score can be retried from the client afterwards — see `verified` in the failure
 * response below, and `/api/quiz` — while the name and email live only in the session
 * cookie, so they are the pair that has to be banked first.
 *
 * An earlier version posted to `/updateUserDetails`, which does not exist on the
 * backend; the call failed every time inside `saveLead`'s catch, so no lead's name or
 * email was ever stored.
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

  /* The code is now spent, so the session is upgraded before the writes. Everything
     below this line is retryable against that verified session; nothing below it can
     be recovered by entering a code again. */
  await markVerified(session);

  /* Analytics only, and the app tolerates it failing too (OTPScreen wraps its own
     follow-up call in a catch), so a blip here must not cost the user their score. */
  let account: CheckUser | undefined;
  try {
    account = await backendFetch<CheckUser>("/check-user", {
      method: "POST",
      body: JSON.stringify({ phone: session.phone }),
    });
  } catch (error) {
    console.error("check-user failed", (error as Error).message);
  }

  // Banked first, and never fatal — the user is waiting on a score, not on this.
  const leadSaved = await saveLead(session);

  let quiz;
  try {
    quiz = await saveQuizAnswers(session.phone, parsedAnswers.answers);
  } catch (error) {
    console.error("quiz save failed", (error as Error).message);
    return Response.json(
      {
        error: "We couldn't save your answers. Please try again.",
        /* The one thing the client cannot work out for itself, and the thing it has
           to know: the number IS verified, so the way out is `/api/quiz`, not
           another code. Retrying the code here would answer "that code isn't
           right" — true, and completely misleading. */
        verified: true,
      },
      { status: 502 },
    );
  }

  return Response.json({
    score: quiz.score,
    riskLevel: quiz.riskLevel,
    breakdown: quiz.breakdown,
    activeReportsCount: quiz.activeReportsCount,
    handoff: handoffFor(session.phone),
    leadSaved,
    /* Whether this number had already got as far as a selfie in the app before the
       funnel touched it. `registered` is no use for this — /verify-otp has just set
       it — and `profileCompleted` was just set by `saveLead`, so the selfie is the
       one part of onboarding the web never does.

       The result screen doesn't read it yet: it's here so "Download the app" can
       become "Open the app" without another round trip, and so it's visible to
       whoever is counting how many leads are genuinely new. */
    returningAppUser: Boolean(account?.selfieUploaded),
  });
}
