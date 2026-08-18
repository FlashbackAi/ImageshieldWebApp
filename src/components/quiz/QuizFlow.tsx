"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "@/components/landing/icons";
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
        <p className="mt-10 text-[15px] leading-4 font-bold tracking-[4px] text-ink-muted uppercase lg:mt-[70px]">
          Likeness Health Quiz ({step}/{asked.length})
        </p>

        {/* 24/36 Bold in flat black — the funnel's usual heading size and weight,
            in the same black the option labels underneath use. */}
        <h1 className="mt-[16px] text-[24px] leading-9 font-bold text-black">
          {question.question}
        </h1>

        {/* 14/21 regular in black at 45% — a qualifier on the question rather
            than copy in its own right. The translucent black is the design's
            own value, and it sits a touch lighter than `ink-faint` would. */}
        {question.hint ? (
          <p className="mt-[9px] text-[14px] leading-[21px] text-black/45">
            {question.hint}
          </p>
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
                /* Picked rows keep the white fill and the regular weight the design
                   draws — only the border and the label take the brand colour. A
                   tinted fill reads as a disabled row next to the plain ones. The
                   resting label is the export's flat black, not `ink`: these rows
                   are the one place the design sets the label off the body grey. */
                /* The 1.61px outline is an inset shadow, not a border, for two
                   reasons the export makes plain: a border snaps to whole device
                   pixels (1.5px on a 2x screen, 2px on a 1x one — never 1.61),
                   and CSS measures padding inside a border where Figma measures
                   it from the frame edge and lays the stroke over it. The shadow
                   antialiases to its true width and overlays the padding box, so
                   the checkbox lands at 17.6px from the edge, as drawn. */
                className={`flex h-[53.7px] items-center gap-3 rounded-[14px] bg-canvas px-[17.6px] text-left text-[15px] leading-[22.5px] transition-[color,box-shadow] ${
                  on
                    ? "text-brand shadow-[inset_0_0_0_1.61px_var(--color-brand)]"
                    : "text-black shadow-[inset_0_0_0_1.61px_var(--color-line-soft)] hover:shadow-[inset_0_0_0_1.61px_var(--color-brand-soft)]"
                }`}
              >
                {/* "Select all that apply" is the only thing separating a multi
                    question from a single one, so the box is what carries it —
                    single-answer rows advance on tap and never show a checked
                    state to draw. 20px on a 4px radius, per the design. */}
                {question.multi ? (
                  <span
                    aria-hidden
                    className={`flex size-5 shrink-0 items-center justify-center rounded-[4px] transition-[background-color,box-shadow] ${
                      on
                        ? "bg-brand text-ink-inverse"
                        : "shadow-[inset_0_0_0_1.61px_var(--color-line-strong)]"
                    }`}
                  >
                    {on ? <Check className="size-5" /> : null}
                  </span>
                ) : null}
                {option}
              </button>
            );
          })}
        </div>

        {/* Single-answer questions advance on tap, so only the "select all that
            apply" ones need a way to say they're done. The design insets it 24px
            either side of the option column rather than running it to the full
            560 — it's the one control on the screen that isn't a row. */}
        {question.multi ? (
          <button
            type="button"
            disabled={!chosen.size}
            onClick={() =>
              step < asked.length
                ? go(step + 1)
                : router.push(nextPath("quiz-questions") ?? STEP_PATHS.landing)
            }
            className="mt-8 mx-auto flex h-14 w-full max-w-[512px] items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40"
          >
            Continue
          </button>
        ) : null}
      </div>
    </>
  );
}
