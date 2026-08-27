import Link from "next/link";
import { ShieldMark } from "@/components/ShieldMark";
import { STEP_PATHS } from "@/lib/funnel";

/**
 * What the quiz screens show when the definition can't be read.
 *
 * The questions come from the API, so without them there is no quiz to render. This
 * says so plainly rather than showing an empty screen or, worse, a set of questions
 * this repo made up — whose answers the API would reject at submit, after the visitor
 * had answered all of them.
 *
 * "Try again" points back at the questions rather than the intro: the visitor is
 * already signed in by this point, and the intro would only walk them through the
 * details form again.
 */
export function QuizUnavailable() {
  return (
    <div className="flex flex-col items-center text-center">
      <ShieldMark monotone className="w-[37px] text-brand" />
      <h1 className="mt-8 max-w-[420px] text-2xl leading-9 font-bold text-ink">
        The quiz isn&apos;t available right now
      </h1>
      <p className="mt-4 max-w-[420px] text-base text-ink-muted">
        This is on us, not on you — nothing you entered has been lost. Try again in a
        moment.
      </p>
      <Link
        href={STEP_PATHS["quiz-questions"]}
        className="mt-8 flex h-14 w-full max-w-[317px] items-center justify-center rounded-full bg-brand text-lg font-semibold text-ink-inverse transition-colors hover:bg-cta"
      >
        Try again
      </Link>
    </div>
  );
}
