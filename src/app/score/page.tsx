import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ResumeSave } from "@/components/score/ResumeSave";
import { ScoreResult } from "@/components/score/ScoreResult";
import { STEP_PATHS } from "@/lib/funnel";
import { loadScore } from "@/lib/score-record";

export const metadata: Metadata = {
  title: "ImageShield — Your Likeness Health Score",
};

/**
 * The result screen.
 *
 * Rendered on the server off the verified cookie, so the score is in the first paint
 * — no spinner, and no window in which the page is mounted without a score to show.
 * That also means it can't be linked to: without the cookie there is nothing to
 * render and the visitor is sent back into the funnel.
 */
export default async function ScorePage() {
  const loaded = await loadScore();

  if (!loaded.ok) {
    /* Verified but nothing stored means the answers never landed — the code was
       accepted and the write after it wasn't. The answers are still in the tab and
       the session is still good for the write, so `ResumeSave` makes it from here
       instead of marching the user back through the quiz and a second code. */
    if (loaded.reason === "missing") {
      return (
        <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas-tint px-5">
          <SiteHeader />
          <ResumeSave />
        </main>
      );
    }
    // No verified session at all — this browser hasn't earned a score yet.
    if (loaded.reason === "unverified") redirect(STEP_PATHS.details);

    /* The backend is unreachable. The visitor IS verified and their score IS
       saved, so sending them back through OTP would be both wrong and rude — the
       only thing missing is this request. Say so and let them retry. */
    return (
      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas-tint px-5 text-center">
        <SiteHeader />
        <h1 className="max-w-[420px] text-2xl leading-9 font-bold text-ink">
          We couldn&apos;t load your score just now
        </h1>
        <p className="mt-4 max-w-[420px] text-base text-ink-muted">
          It&apos;s saved against your number — this is on us. Try again in a moment.
        </p>
        <Link
          href={STEP_PATHS.score}
          className="mt-8 flex h-14 w-full max-w-[317px] items-center justify-center rounded-full bg-brand text-lg font-semibold text-ink-inverse transition-colors hover:bg-cta"
        >
          Try again
        </Link>
      </main>
    );
  }

  return <ScoreResult record={loaded.record} handoff={loaded.handoff} />;
}
