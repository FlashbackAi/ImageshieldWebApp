import { loadScore } from "@/lib/score-record";
import { readVerifiedSession } from "@/lib/session";

const STATUS = {
  unverified: [401, "Not verified"],
  missing: [404, "No score on record"],
  unavailable: [502, "Couldn't load your score"],
} as const;

/**
 * GET /api/score — the stored score, for anything that can't read it on the server.
 *
 * The result screen renders on the server and calls `loadScore` directly, so this is
 * the client-side door onto the same thing: a tab that wants to refresh its score
 * without a navigation. Both go through `loadScore`, so neither can drift into a
 * different idea of whose score this is.
 */
export async function GET() {
  const loaded = await loadScore();
  if (!loaded.ok) {
    const [status, error] = STATUS[loaded.reason];
    return Response.json({ error }, { status });
  }

  // The phone isn't part of the record — it's session state — but the response has
  // always carried it, and it's the number the app should be signed into.
  const session = await readVerifiedSession();
  return Response.json({
    ...loaded.record,
    phone: session?.phone,
    handoff: loaded.handoff,
  });
}
