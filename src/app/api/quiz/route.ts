import { validateAnswers } from "@/lib/quiz";
import { noteVersionDrift, readLiveQuizDefinition } from "@/lib/quiz-definition";
import { saveQuizAnswers } from "@/lib/quiz-save";
import { allowPerIp } from "@/lib/rate-limit";
import { readSession, SessionUnavailable } from "@/lib/session";
import { presentableFailure } from "@/lib/v1/errors";

/**
 * POST /api/quiz — { quizVersion, answers }
 *
 * The funnel's score write. Every set of answers goes through here, which is new: the
 * quiz used to be answered before the phone number, so the submit had to ride along
 * with `/api/otp/verify` to avoid a window where a half-authenticated visitor could
 * write. The questions now come after sign-in — the API serves the quiz definition
 * only to a session — so there is always a session by the time answers exist, and
 * this is simply where they go.
 *
 * That reordering deleted a whole failure mode. A failed score write used to strand
 * someone whose code was already spent, which is why the verify response carried a
 * `verified: true` flag telling the client to retry here instead of re-entering a
 * code that could no longer work. Now a failed write is just a failed write: the
 * session outlives it, and the score screen retries against the same session.
 *
 * Nothing in the body says whose record this is. It cannot: the API takes the person
 * from the bearer token.
 */
export async function POST(request: Request) {
  /* Cheap pre-check so a signed-out browser is turned away without a round trip.
     The real gate is the API, which is the only thing that can tell a live session
     from a revoked one. */
  if ((await readSession()) === null) {
    return Response.json(
      { error: "Your session expired. Start again." },
      { status: 401 },
    );
  }

  let body: { quizVersion?: unknown; answers?: unknown };
  try {
    body = (await request.json()) as { quizVersion?: unknown; answers?: unknown };
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  /* Counted BEFORE either API call below, which is the whole point of its position:
     this route reads the definition and then writes a score, so an unchecked retry
     loop would be two calls per request rather than one. Counted per address, because
     /v1 hands out no identifier to key on and the session's tokens rotate, so nothing
     in the cookie is stable enough to be a bucket. Loose enough that a visitor tapping
     "Try again" at a genuinely flaky moment never meets it, and a shared address still
     gets far more retries than a real recovery needs. */
  if (!allowPerIp(request, "quiz", 30, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  /* Re-read rather than trusting the version the client sent. The screen that rendered
     these questions read the definition a minute or two ago, and this is the one place
     that can confirm the server still means the same thing by them — the answers are
     validated against what comes back and pinned to its version, so a quiz edited
     mid-session is caught here rather than stored wrong. */
  let live;
  try {
    live = await readLiveQuizDefinition();
  } catch (error) {
    if (error instanceof SessionUnavailable) {
      return Response.json(
        { error: "Your session expired. Start again." },
        { status: 401 },
      );
    }
    console.error("live quiz definition unavailable", (error as Error).message);
    return Response.json(
      { error: "We couldn't load the quiz just now. Please try again." },
      { status: 502 },
    );
  }
  noteVersionDrift(body?.quizVersion, live);

  const parsed = validateAnswers(live, body?.answers);
  if (!parsed.ok) {
    /* Answers that fitted what was displayed but not what the server now serves. There
       is no write to retry — these are answers to different questions. */
    console.warn("answers no longer fit the live quiz", parsed.error);
    return Response.json(
      {
        error: "The quiz has been updated. Please answer it again.",
        retakeQuiz: true,
      },
      { status: 409 },
    );
  }

  try {
    await saveQuizAnswers(live.quiz_version, parsed.answers);
  } catch (error) {
    if (error instanceof SessionUnavailable) {
      return Response.json(
        { error: "Your session expired. Start again." },
        { status: 401 },
      );
    }
    console.error("quiz save failed", (error as Error).message);
    return Response.json(
      {
        error: presentableFailure(
          error,
          "We couldn't save your answers. Please try again.",
        ),
      },
      { status: 502 },
    );
  }

  /* No score in the response on purpose: the result screen reads it back off the
     record through `loadScore`, so there is one definition of "this browser's score"
     and a stale copy can't be handed forward from here. */
  return Response.json({ ok: true });
}
