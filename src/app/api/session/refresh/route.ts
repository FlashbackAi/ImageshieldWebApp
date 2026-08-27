import { refreshSession, SessionUnavailable } from "@/lib/session";

/**
 * POST /api/session/refresh — no body.
 *
 * Exists because /v1 refresh tokens ROTATE and a server component cannot write a
 * cookie. When the result screen renders and finds the access token spent, it has
 * the refresh token in hand but nowhere to put the replacement — HTTP cannot set a
 * cookie once a response has started streaming, which is why Next allows
 * `cookies().set` only from a route handler or a server function.
 *
 * So the page renders a small client component that calls this and re-renders. One
 * extra round trip, and only for a visitor coming back after their access token ran
 * out — the alternative was rotating tokens inside a render and dropping the new
 * pair on the floor, which turns a live session into a dead one on the next request.
 *
 * Answers 401 only when the session is genuinely gone. A refresh that never reached
 * the API is a 502: it says nothing about whether the session is valid, and signing
 * someone out over a network blip is the one thing this must not do.
 */
export async function POST() {
  try {
    await refreshSession();
  } catch (error) {
    if (error instanceof SessionUnavailable) {
      return Response.json(
        { error: "Your session expired. Start again." },
        { status: 401 },
      );
    }
    console.error("session refresh failed", (error as Error).message);
    return Response.json(
      { error: "Couldn't reach the server. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
