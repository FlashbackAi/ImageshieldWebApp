import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Calculating } from "@/components/quiz/Calculating";
import { QuizUnavailable } from "@/components/quiz/QuizUnavailable";
import { STEP_PATHS } from "@/lib/funnel";
import { loadQuizDefinition } from "@/lib/quiz-definition";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "ImageShield — Calculating your score",
};

/**
 * Where the answers are submitted and the score computed.
 *
 * It used to be a staged pause: the quiz came before the phone number, so nothing
 * could be computed here — there was no session to write with — and the screen held
 * for three seconds purely so the loader had time to read as a loader. The submit
 * happened two screens later, bundled into the OTP verify.
 *
 * Now it does the thing it always claimed to. The visitor is signed in by this point,
 * so this screen POSTs the answers and moves on when the API answers, with a floor on
 * how briefly it can flash past.
 *
 * One centred block, and the header floats over it — the design centres the mark
 * and the line on the full viewport rather than on the space below the bar.
 */
export default async function CalculatingPage() {
  if ((await readSession()) === null) redirect(STEP_PATHS.details);

  /* Needed to check the visitor answered everything before this screen writes, and to
     pin the answers to the version they were given against. */
  const definition = await loadQuizDefinition();

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas-tint px-5">
      <SiteHeader />
      {definition === null ? (
        <QuizUnavailable />
      ) : (
        <Calculating definition={definition} />
      )}
    </main>
  );
}
