import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { QuizFlow } from "@/components/quiz/QuizFlow";
import { QuizUnavailable } from "@/components/quiz/QuizUnavailable";
import { STEP_PATHS } from "@/lib/funnel";
import { loadQuizDefinition } from "@/lib/quiz-definition";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "ImageShield — Likeness Health Quiz",
};

/**
 * The questions themselves — one screen each, all served from this route with the
 * step in `?q=`, so the browser's own back button walks the quiz backwards.
 *
 * `QuizFlow` reads that query string, which opts it out of prerendering; the
 * Suspense boundary keeps the header and the canvas in the static HTML so the
 * screen doesn't arrive blank.
 *
 * Behind sign-in, and that is the point of where it sits in the funnel: the questions
 * come from `GET /v1/quiz`, which the API answers only to a session. Reading them here
 * means the funnel renders the definition the server is actually serving, so the
 * answers cannot be rejected at submit for being answers to a quiz nobody is asking.
 */
export default async function QuizQuestionsPage() {
  /* Checked before the definition is fetched rather than inferred from its failure:
     a lost session and a broken quiz endpoint both stop this screen, and they send the
     visitor to completely different places. */
  if ((await readSession()) === null) redirect(STEP_PATHS.details);

  const definition = await loadQuizDefinition();

  return (
    <main className="relative min-h-[100dvh] bg-canvas-tint pt-[65px]">
      <SiteHeader />
      {definition === null ? (
        <div className="flex min-h-[60dvh] items-center justify-center px-5">
          <QuizUnavailable />
        </div>
      ) : (
        <Suspense>
          <QuizFlow definition={definition} />
        </Suspense>
      )}
    </main>
  );
}
