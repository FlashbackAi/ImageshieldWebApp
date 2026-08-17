import { backendFetch, BackendError } from "@/lib/api";
import { splitName } from "@/lib/contact";
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

type CheckUser = {
  registered: boolean;
  selfieUploaded: boolean;
  profileCompleted: boolean;
  consentSigned: boolean;
};

/**
 * POST /api/otp/verify — { code, answers }
 *
 * The one place the funnel writes anything. Verifying and saving happen in the same
 * request so there's no window where a half-verified session can write: the phone
 * comes out of the signed cookie, never out of this body.
 *
 * The calls, and their order, are the app's own onboarding sequence (OTPScreen →
 * ProfileSetupScreen), against the same endpoints:
 *
 *   /verify-otp                → marks the record `registered`, same as the app.
 *   /check-user                → what the app asks next. Nothing here branches on
 *                                it, but it is what fires the backend's `check_user`
 *                                activity log, so web sign-ins show up in the same
 *                                analytics as app ones.
 *   /api/likeness-health-quiz  → scores the answers onto the mobile user record,
 *                                which is what the app reads back.
 *   /update-profile            → the lead's name and email.
 *
 * `/update-profile` also sets `profileCompleted: true`, and the app treats that as
 * "onboarding finished" (SplashScreen line 114, OTPScreen line 152). So a lead who
 * came through the web and later installs the app lands on the Dashboard without
 * being asked for a selfie, and has to add one from Settings. That is a known and
 * accepted trade for capturing the lead against the record the app actually reads —
 * the alternative was a mobile-side change to also require `selfieUploaded`.
 *
 * An earlier version posted to `/updateUserDetails`, which does not exist on the
 * backend; the call failed every time inside the catch below, so no lead's name or
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

  // From here the phone is proven, so the session is upgraded before the writes —
  // if a write fails the user can still land on the result screen and retry.
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

  let quiz: QuizResponse;
  try {
    quiz = await backendFetch<QuizResponse>("/api/likeness-health-quiz", {
      method: "POST",
      // Bare, no `+`, exactly as the app's quizSync posts it. The backend puts the
      // `+` back either way; sending the same bytes keeps the two clients from
      // drifting apart if that ever stops being true.
      body: JSON.stringify({
        userPhone: session.phone.replace(/\+/g, ""),
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
    /* Whether this number had already got as far as a selfie in the app before the
       funnel touched it. `registered` is no use for this — /verify-otp has just set
       it — and `profileCompleted` is about to be set by /update-profile below, so
       the selfie is the one part of onboarding the web never does.

       The result screen doesn't read it yet: it's here so "Download the app" can
       become "Open the app" without another round trip, and so it's visible to
       whoever is counting how many leads are genuinely new. */
    returningAppUser: Boolean(account?.selfieUploaded),
  });
}
