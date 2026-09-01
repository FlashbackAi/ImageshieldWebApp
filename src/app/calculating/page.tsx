import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Calculating } from "@/components/quiz/Calculating";
import { STEP_PATHS } from "@/lib/funnel";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "ImageShield — Calculating your score",
};

/**
 * Where the answers are submitted and the score computed.
 *
 * The first screen in the funnel that can do anything with the quiz: the answers have
 * been sitting in sessionStorage since before the details form, and the code entered
 * one screen ago is what bought the session they are finally written with.
 *
 * A visitor with no session has not verified, so there is nothing to write with and
 * the details form is where they belong. The questions are NOT re-read here — they
 * come from `GET /v1/quiz` like everywhere else on the client, and `/api/quiz` is
 * the one place that checks them against what the server is serving.
 *
 * One centred block, and the header floats over it — the design centres the mark
 * and the line on the full viewport rather than on the space below the bar.
 */
export default async function CalculatingPage() {
  if ((await readSession()) === null) redirect(STEP_PATHS.details);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas-tint px-5">
      <SiteHeader />
      <Calculating />
    </main>
  );
}
