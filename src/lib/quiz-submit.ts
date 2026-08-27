"use client";

import { readFunnel } from "./funnel-state";
import type { QuizDefinition } from "./quiz";

/**
 * Posting the answers, shared by the two screens that do it.
 *
 * `Calculating` does it as the funnel's normal last step. `ResumeSave` does it on the
 * score screen when a signed-in visitor turns out to have no score on record — the
 * write never landed, and re-answering seven questions to fix one failed POST would be
 * absurd. Same request, same outcomes, so it lives here rather than twice.
 *
 * Deliberately setState-free and outside any component. It returns an outcome for the
 * caller to apply from a callback, which is what keeps both screens clear of a
 * synchronous setState inside an effect — the thing that causes cascading renders, and
 * that React's lint rule catches even when the state update is several calls deep.
 */
export type SubmitOutcome =
  | { ok: true }
  /* Split by where each one has to send the visitor, which is the only reason a
     failed POST needs more than one shape. */
  | {
      ok: false;
      reason:
        /** The session went while the quiz was being answered. */
        | "signed-out"
        /** The quiz was edited between being read and being answered, and these
         *  answers no longer fit it. Nothing to retry — the questions changed. */
        | "retake"
        /** Worth trying again from where the visitor stands. */
        | "failed";
      error: string;
    };

export async function submitAnswers(
  definition: QuizDefinition,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        /* The version the answers were given against. The server re-reads the live
           definition and validates against that, so this is what lets it tell a
           drifted quiz from a malformed body. */
        quizVersion: definition.quiz_version,
        answers: readFunnel().answers,
      }),
    });
  } catch {
    return {
      ok: false,
      reason: "failed",
      error: "We couldn't reach the server. Check your connection.",
    };
  }

  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    retakeQuiz?: boolean;
  };
  const error = body.error ?? "We couldn't save your answers.";

  if (response.status === 401) return { ok: false, reason: "signed-out", error };
  if (body.retakeQuiz === true) return { ok: false, reason: "retake", error };
  return { ok: false, reason: "failed", error };
}
