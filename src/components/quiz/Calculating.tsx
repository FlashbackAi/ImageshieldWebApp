"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldMark } from "@/components/ShieldMark";
import { nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel } from "@/lib/funnel-state";
import { missingAnswers } from "@/lib/quiz";

/**
 * How long the loader holds before moving on.
 *
 * Nothing is actually being computed here — the score can't be worked out until a
 * verified phone number exists to hang it on, which is two screens away. So this is
 * a fixed beat, long enough to read the line and short enough not to feel stuck.
 */
const HOLD_MS = 3000;

/* The ring is 228° of a 96px circle: r 45.69 + half of the 4.63 stroke lands the
   outer edge exactly on the box. Dashes are in path length, so the visible arc is
   that fraction of the circumference and the gap is the rest. */
const R = 45.69;
const SWEEP = (228 / 360) * 2 * Math.PI * R;
const GAP = 2 * Math.PI * R - SWEEP;

export function Calculating() {
  const router = useRouter();

  useEffect(() => {
    /* Read the store directly rather than through `useFunnel`: this runs once, and
       the hook's first value is the empty server snapshot, which would read as an
       abandoned quiz and bounce someone who answered everything. */
    if (missingAnswers(readFunnel().answers).length) {
      router.replace(STEP_PATHS["quiz-questions"]);
      return;
    }
    const timer = setTimeout(
      () => router.push(nextPath("calculating") ?? STEP_PATHS.landing),
      HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [router]);

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
