import { validateAnswers } from "@/lib/quiz";
import { saveQuizAnswers } from "@/lib/quiz-save";
import { allow } from "@/lib/rate-limit";
import { readVerifiedSession } from "@/lib/session";

/**
 * POST /api/quiz — { answers }
 *
 * Saves the answers for a browser that has ALREADY proved its phone number. It exists
 * because `/verify-otp` consumes the code it accepts: once the funnel has verified,
 * the score write is the only step left, and re-running the verify to get at it is
 * impossible — the same six digits are now wrong. Without this route a backend blip on
 * that one write sent the user back through the whole funnel for a fresh code.
 *
 * The phone still comes out of the signed cookie, never the request body, so this is
 * not a door onto anyone else's record — it writes exactly where `/api/otp/verify`
 * would have.
 */
export async function POST(request: Request) {
  const session = await readVerifiedSession();
  if (!session) {
    return Response.json(
      { error: "Your session expired. Start again." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = validateAnswers((body as Record<string, unknown>)?.answers);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  /* A retry loop shouldn't be able to hammer the backend — and re-scoring queries
     the reports table on every call. Loose enough that a user tapping "Try again"
     at a genuinely flaky moment never meets it. */
  if (!allow(`quiz:${session.phone}`, 10, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  try {
    await saveQuizAnswers(session.phone, parsed.answers);
  } catch (error) {
    console.error("quiz save failed", (error as Error).message);
    return Response.json(
      { error: "We couldn't save your answers. Please try again." },
      { status: 502 },
    );
  }

  /* No score in the response on purpose: the result screen reads it back off the
     record through `loadScore`, so there is one definition of "this browser's
     score" and a stale copy can't be handed forward from here. */
  return Response.json({ ok: true });
}
