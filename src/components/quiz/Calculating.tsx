"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldMark } from "@/components/ShieldMark";
import { nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel } from "@/lib/funnel-state";
import { quizIncomplete, type QuizDefinition } from "@/lib/quiz";
import { submitAnswers, type SubmitOutcome } from "@/lib/quiz-submit";

/**
 * Submits the answers, then hands over to the score screen.
 *
 * This used to be a fixed three-second pause with nothing behind it — the quiz came
 * before the phone number, so there was no session to write with and the real submit
 * happened two screens later inside the OTP verify. It is a real wait now.
 *
 * The floor below is what is left of the staged version, and it earns its keep for a
 * different reason: the write usually answers in well under a second, and a loader
 * that appears and vanishes inside 200ms reads as a glitch rather than as progress.
 */
const MIN_HOLD_MS = 1200;

/* The ring is 228° of a 96px circle: r 45.69 + half of the 4.63 stroke lands the
   outer edge exactly on the box. Dashes are in path length, so the visible arc is
   that fraction of the circumference and the gap is the rest. */
const R = 45.69;
const SWEEP = (228 / 360) * 2 * Math.PI * R;
const GAP = 2 * Math.PI * R - SWEEP;

export function Calculating({ definition }: { definition: QuizDefinition }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /* React runs effects twice in development, and this one writes. */
  const started = useRef(false);

  /* Applies an outcome. A `useCallback` rather than inline so the effect below hands
     it to a promise instead of calling setState in its own body — a synchronous
     setState inside an effect is what triggers cascading renders. */
  const apply = useCallback(
    (outcome: SubmitOutcome) => {
      if (outcome.ok) {
        return router.push(nextPath("calculating") ?? STEP_PATHS.score);
      }
      if (outcome.reason === "signed-out") {
        return router.replace(STEP_PATHS.details);
      }
      if (outcome.reason === "retake") {
        return router.replace(STEP_PATHS["quiz-questions"]);
      }
      setError(outcome.error);
    },
    [router],
  );

  /* The floor overlaps the request rather than being added to it, so a slow write
     costs its own time and nothing more. It exists because the write usually answers
     in well under a second, and a loader that appears and vanishes inside 200ms reads
     as a glitch rather than as progress. */
  const run = useCallback(
    () =>
      Promise.all([
        submitAnswers(definition),
        new Promise((done) => setTimeout(done, MIN_HOLD_MS)),
      ]).then(([outcome]) => outcome),
    [definition],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    /* Read the store directly rather than through `useFunnel`: this runs once, and
       the hook's first value is the empty server snapshot, which would read as an
       abandoned quiz and bounce someone who answered everything. */
    if (quizIncomplete(definition, readFunnel())) {
      router.replace(STEP_PATHS["quiz-questions"]);
      return;
    }

    let live = true;
    run().then((outcome) => {
      if (live) apply(outcome);
    });
    return () => {
      live = false;
    };
  }, [apply, definition, router, run]);

  if (error !== null) {
    return (
      <div className="flex flex-col items-center text-center">
        <ShieldMark monotone className="w-[37px] text-brand" />
        <h1 className="mt-8 max-w-[420px] text-2xl leading-9 font-bold text-ink">
          We couldn&apos;t finish scoring your quiz
        </h1>
        {/* Says what is safe, because it is the question a stalled screen raises:
            the answers are still in this tab and the number is already verified, so
            retrying costs nothing and needs no new code. */}
        <p className="mt-4 max-w-[420px] text-base text-ink-muted">
          {error} Your answers are still here and your number is verified — nothing
          needs re-sending.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            run().then(apply);
          }}
          className="mt-8 flex h-14 w-full max-w-[317px] items-center justify-center rounded-full bg-brand text-lg font-semibold text-ink-inverse transition-colors hover:bg-cta"
        >
          Try again
        </button>
        <Link
          href={STEP_PATHS["quiz-questions"]}
          className="mt-5 text-sm font-medium text-brand transition-colors hover:opacity-70"
        >
          Go back to the quiz
        </Link>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col items-center">
      <div className="relative flex size-24 items-center justify-center">
        <div
          aria-hidden
          className="absolute -inset-1.5 rounded-full bg-brand-bright opacity-[0.072] blur-[40px]"
        />
        <svg
          viewBox="0 0 96 96"
          aria-hidden
          className="absolute inset-0 size-24 animate-spin text-brand [animation-duration:1.4s]"
        >
          <circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="4.63"
            strokeLinecap="round"
            strokeDasharray={`${SWEEP} ${GAP}`}
            /* Dashes start at 3 o'clock; the design's arc starts at 12. */
            transform="rotate(-90 48 48)"
          />
        </svg>
        <ShieldMark monotone className="relative w-[37px] text-brand" />
      </div>

      <h1 className="mt-8 max-w-[320px] text-center text-2xl leading-9 font-bold tracking-[-0.5px] text-ink">
        Calculating your Likeness Health Score
        {/* Service mark, set so it hangs off the cap line like the design draws it. */}
        <sup className="align-[2px] text-[0.5em]">SM</sup>
      </h1>
    </div>
  );
}
