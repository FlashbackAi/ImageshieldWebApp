import "server-only";

import { backendFetch, BackendError } from "./api";
import { handoffFor, type Handoff } from "./handoff";
import type { ScoreFactor, ScoreRecord } from "./score";
import { readVerifiedSession } from "./session";

/**
 * Reads a verified visitor's stored score back out of the backend.
 *
 * Shared by the result screen and `GET /api/score` so there is one definition of
 * what "this browser's score" means. The phone comes out of the signed cookie, never
 * out of the request — a score is not something one visitor should be able to look
 * up for another.
 *
 * Read back rather than carried over from the verify response so a reloaded or
 * re-shared tab still works, and so a score that has since moved (the app found
 * active reports) shows its current value.
 */
type StoredQuiz = {
  success: boolean;
  data: {
    score: number;
    riskLevel: string;
    breakdown: ScoreFactor[];
    activeReportsCount?: number;
    completedAt?: string;
  };
};

export type ScoreLoad =
  | { ok: true; record: ScoreRecord; handoff: Handoff }
  /* Split apart because the funnel sends them to different places: an unverified
     browser goes back to the details form, a verified one with nothing stored has
     to re-submit its answers. */
  | { ok: false; reason: "unverified" | "missing" | "unavailable" };

export async function loadScore(): Promise<ScoreLoad> {
  const session = await readVerifiedSession();
  if (!session) return { ok: false, reason: "unverified" };

  try {
    const stored = await backendFetch<StoredQuiz>(
      `/api/likeness-health-quiz?userPhone=${encodeURIComponent(session.phone)}`,
    );
    return {
      ok: true,
      record: {
        ...stored.data,
        breakdown: stored.data.breakdown ?? [],
        fullName: session.fullName,
      },
      handoff: handoffFor(session.phone),
    };
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return { ok: false, reason: "missing" };
    }
    console.error("score fetch failed", (error as Error).message);
    return { ok: false, reason: "unavailable" };
  }
}
