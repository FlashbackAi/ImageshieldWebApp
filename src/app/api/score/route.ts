import { loadScore } from "@/lib/score-record";

/**
 * GET /api/score — the stored score, for anything that can't read it on the server.
 *
 * The result screen renders on the server and calls `loadScore` directly, so this is
 * the client-side door onto the same thing: a tab that wants to refresh its score
 * without a navigation. Both go through `loadScore`, so neither can drift into a
 * different idea of whose score this is.
 *
 * `stale` is a 401 here on purpose, unlike on the page. A client that gets one should
 * POST `/api/session/refresh` and ask again; a page can't, which is the whole reason
 * that route exists.
 */
const STATUS: Record<string, [number, string]> = {
  "signed-out": [401, "Not signed in"],
  stale: [401, "Session needs refreshing"],
  missing: [404, "No score on record"],
  outdated: [409, "Your answers were given to an older version of the quiz"],
  pending: [202, "Your score is still being worked out"],
  unavailable: [502, "Couldn't load your score"],
};

export async function GET() {
  const loaded = await loadScore();
  if (!loaded.ok) {
    const [status, error] = STATUS[loaded.reason];
    return Response.json({ error, reason: loaded.reason }, { status });
  }

  return Response.json({
    ...loaded.record,
    handoff: loaded.handoff,
  });
}
