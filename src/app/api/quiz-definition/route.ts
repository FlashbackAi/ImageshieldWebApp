import { readVisitorQuizDefinition } from "@/lib/quiz-definition";

/**
 * GET /api/quiz-definition — the active quiz, for a visitor with no session yet.
 *
 * A pass-through to `GET /v1/quiz`, and worth having rather than letting the browser
 * call the API itself for two reasons. The API host is server-only config — it has no
 * `NEXT_PUBLIC_` prefix precisely so it never ships in a bundle — and a browser-side
 * call would need CORS from a service that has no reason to grant it to this origin.
 *
 * Five screens need the definition, so the read underneath is cached for a few minutes
 * (see `DEFINITION_TTL_S`); this route is the only public thing in front of it. Safe to
 * be public because it is the same bytes for every visitor: no token goes into the
 * upstream read, so nothing about anyone comes back out of it.
 */
export async function GET() {
  const definition = await readVisitorQuizDefinition();

  if (definition === null) {
    /* 503 rather than 500: the funnel is fine, the definition is momentarily
       unreadable, and the difference decides whether the screen offers a retry or
       apologises. `no-store` so a failed read is never the answer a CDN keeps. */
    return Response.json(
      { error: "We couldn't load the quiz just now. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  /* Cached at the edge for the same window the upstream read uses, with
     stale-while-revalidate so the refresh never lands in a visitor's wait. */
  return Response.json(definition, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
