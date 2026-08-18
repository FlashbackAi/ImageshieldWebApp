"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldMark } from "@/components/ShieldMark";
import { STEP_PATHS } from "@/lib/funnel";
import { readFunnel } from "@/lib/funnel-state";
import { missingAnswers } from "@/lib/quiz";

/**
 * What the result screen shows a verified visitor with no score on record.
 *
 * That combination means one thing: the code was accepted and the write after it
 * wasn't. The answers are still in this tab's sessionStorage and the session is still
 * verified, so the missing step is one POST — this screen makes it, rather than
 * sending the user back to `/quiz/questions` to retype seven answers and collect a
 * fresh code for a number that is already proved.
 *
 * Only if the answers really are gone (a new browser, a cleared tab) is the quiz the
 * honest destination.
 */
type SaveResult =
  | { ok: true }
  /* Split out because they go different places: an expired session has to start
     from the number again, anything else is worth retrying where the user stands. */
  | { ok: false; expired: boolean; error: string };

/**
 * Outside the component, and returning its outcome rather than setting state, so the
 * effect below can hand the result to React from a callback instead of mid-render.
 */
async function postAnswers(): Promise<SaveResult> {
  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: readFunnel().answers }),
    });

    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      expired: res.status === 401,
      error: body.error ?? "We couldn't save your answers.",
    };
  } catch {
    return {
      ok: false,
      expired: false,
      error: "We couldn't reach the server. Check your connection.",
    };
  }
}

export function ResumeSave() {
  const router = useRouter();
  const [failed, setFailed] = useState<string | null>(null);
  /* React runs effects twice in development, and this one POSTs. */
  const started = useRef(false);

  const apply = useCallback(
    (result: SaveResult) => {
      /* Re-render the server component that sent us here; it reads the score back
         off the record, so this is the whole handoff. */
      if (result.ok) return router.refresh();
      // The verified session went while this tab sat here — back to the number.
      if (result.expired) return router.replace(STEP_PATHS.details);
      setFailed(result.error);
    },
    [router],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (missingAnswers(readFunnel().answers).length) {
      router.replace(STEP_PATHS["quiz-questions"]);
      return;
    }

    let live = true;
    postAnswers().then((result) => {
      if (live) apply(result);
    });
    return () => {
      live = false;
    };
  }, [apply, router]);

  return (
    <div role="status" className="flex flex-col items-center text-center">
      <ShieldMark monotone className="w-[37px] text-brand" />

      {failed ? (
        <>
          <h1 className="mt-8 max-w-[420px] text-2xl leading-9 font-bold text-ink">
            We couldn&apos;t finish scoring your quiz
          </h1>
          <p className="mt-4 max-w-[420px] text-base text-ink-muted">
            {failed} Your number is verified, so nothing needs re-sending.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(null);
              postAnswers().then(apply);
            }}
            className="mt-8 flex h-14 w-full max-w-[317px] items-center justify-center rounded-full bg-brand text-lg font-semibold text-ink-inverse transition-colors hover:bg-cta"
          >
            Try again
          </button>
          {/* The way out if the retry keeps failing: the quiz still has the answers
              and it is the only other route to a score. */}
          <Link
            href={STEP_PATHS["quiz-questions"]}
            className="mt-5 text-sm font-medium text-brand transition-colors hover:opacity-70"
          >
            Start the quiz again
          </Link>
        </>
      ) : (
        <h1 className="mt-8 max-w-[320px] text-2xl leading-9 font-bold text-ink">
          Finishing your Likeness Health Score
          <sup className="align-[2px] text-[0.5em]">SM</sup>
        </h1>
      )}
    </div>
  );
}
