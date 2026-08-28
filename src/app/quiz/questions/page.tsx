import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { QuizFlow } from "@/components/quiz/QuizFlow";
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
 * Open to anyone. Nothing is asked of the visitor before this point and nothing is
 * sent anywhere from it — the answers go into sessionStorage and are submitted after
 * the phone number is verified. The questions come from `src/lib/quiz-content.ts`
 * because `GET /v1/quiz` needs a session that does not exist yet.
 *
 * The one thing this page reads a cookie for is `signedIn`, and it is not a gate:
 * see the note where `QuizFlow` uses it.
 */
export default async function QuizQuestionsPage() {
  const signedIn = (await readSession()) !== null;

  return (
    <main className="relative min-h-[100dvh] bg-canvas-tint pt-[65px]">
      <SiteHeader />
      <Suspense>
        <QuizFlow signedIn={signedIn} />
      </Suspense>
    </main>
  );
}
