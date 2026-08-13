import { backendFetch, BackendError } from "@/lib/api";
import { handoffFor } from "@/lib/handoff";
import { readVerifiedSession } from "@/lib/session";

type StoredQuiz = {
  success: boolean;
  data: {
    score: number;
    riskLevel: string;
    breakdown: unknown[];
    activeReportsCount?: number;
    completedAt?: string;
  };
};

/**
 * GET /api/score — the result screen's own source of truth.
 *
 * The verify response already carried the score, but a reloaded or re-shared tab has
 * lost it. Reading it back by phone (out of the cookie, not the query string — the
 * score is not something one visitor should be able to look up for another) means
 * the result screen survives a refresh, and shows a score that has since moved
 * because the app found active reports.
 */
export async function GET() {
  const session = await readVerifiedSession();
  if (!session) {
    return Response.json({ error: "Not verified" }, { status: 401 });
  }

  try {
    const stored = await backendFetch<StoredQuiz>(
      `/api/likeness-health-quiz?userPhone=${encodeURIComponent(session.phone)}`,
    );
    return Response.json({
      ...stored.data,
      fullName: session.fullName,
      phone: session.phone,
      handoff: handoffFor(session.phone),
    });
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      // Verified, but the answers never landed — the funnel should send them back
      // to submit rather than show an empty result.
      return Response.json({ error: "No score on record" }, { status: 404 });
    }
    console.error("score fetch failed", (error as Error).message);
    return Response.json({ error: "Couldn't load your score" }, { status: 502 });
  }
}
