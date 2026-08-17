"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { nextPath, STEP_PATHS } from "@/lib/funnel";
import { saveAnswer, toggleAnswer, useFunnel } from "@/lib/funnel-state";
import { isAsked, QUIZ_QUESTIONS, type QuizAnswers } from "@/lib/quiz";
import { QuizProgress } from "./QuizProgress";

/** The questions actually on the table — the last one only joins once it's unlocked. */
function askedQuestions(answers: QuizAnswers) {
  return QUIZ_QUESTIONS.filter((q) => isAsked(q, answers));
}

export function QuizFlow() {
  const router = useRouter();
  const { answers } = useFunnel();
  const params = useSearchParams();

  const asked = askedQuestions(answers);
  /* 1-based in the URL because it's also what the "(1/6)" label counts. Clamped:
     answering the unlock question "No" on the way back shortens the list under a
     step that was valid a moment ago. */
  const step = Math.min(
    Math.max(Number(params.get("q")) || 1, 1),
    asked.length,
  );
  const question = asked[step - 1];

  const go = (to: number) => router.push(`${STEP_PATHS["quiz-questions"]}?q=${to}`);

  function back() {
    if (step > 1) go(step - 1);
    else router.push(STEP_PATHS.quiz);
  }

  function pick(option: string) {
    if (question.multi) {
      toggleAnswer(question.id, option, question.options);
      return;
    }
    /* Recount off the answer we just wrote, not the render's stale copy: saying
       "Yes" to the exploitation question adds a question after this one. */
    const total = askedQuestions(saveAnswer(question.id, option).answers).length;
    if (step < total) go(step + 1);
    else router.push(nextPath("quiz-questions") ?? STEP_PATHS.landing);
  }

  const given = answers[question.id];
  const chosen = new Set(
    Array.isArray(given) ? given : given ? [given] : [],
  );

  return (
    <>
      {/* The design only draws desktop, where the bar sits 137px under the header.
          That much dead space swallows a phone screen, so it tightens down. */}
      <div className="pt-10 sm:pt-20 lg:pt-[137px]">
        <QuizProgress step={step} total={asked.length} onBack={back} />
      </div>

      <div className="mx-auto w-full max-w-[600px] px-5 pb-24">
        <p className="mt-10 text-[12px] leading-none font-bold tracking-[4px] text-ink-muted uppercase lg:mt-[70px]">
          Likeness Health Quiz ({step}/{asked.length})
        </p>

        <h1 className="mt-[16px] text-2xl leading-9 font-bold text-ink">
          {question.question}
        </h1>

        {question.hint ? (
          <p className="mt-1 text-base text-ink-muted">{question.hint}</p>
        ) : null}

        <div className="mt-[30px] flex flex-col gap-3">
          {question.options.map((option) => {
            const on = chosen.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => pick(option)}
                aria-pressed={question.multi ? on : undefined}
                className={`flex h-14 items-center rounded-[14px] border-[1.6px] px-[18px] text-left text-[15px] transition-colors ${
                  on
                    ? "border-brand bg-brand-soft/20 font-semibold text-ink"
                    : "border-line-soft bg-canvas text-ink hover:border-brand-soft"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Single-answer questions advance on tap, so only the "select all that
            apply" ones need a way to say they're done. The design doesn't draw
            this screen; the button borrows the intro's CTA. */}
        {question.multi ? (
          <button
            type="button"
            disabled={!chosen.size}
            onClick={() =>
              step < asked.length
                ? go(step + 1)
                : router.push(nextPath("quiz-questions") ?? STEP_PATHS.landing)
            }
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40"
          >
            Continue
          </button>
        ) : null}
      </div>
    </>
  );
}
