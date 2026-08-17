import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { QuizFlow } from "@/components/quiz/QuizFlow";

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
 */
export default function QuizQuestionsPage() {
  return (
    <main className="relative min-h-[100dvh] bg-canvas-tint pt-[65px]">
      <SiteHeader />
      <Suspense>
        <QuizFlow />
      </Suspense>
    </main>
  );
}
