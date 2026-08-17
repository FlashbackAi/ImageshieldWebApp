import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Calculating } from "@/components/quiz/Calculating";

export const metadata: Metadata = {
  title: "ImageShield — Calculating your score",
};

/**
 * The beat between the last question and the details form.
 *
 * One centred block, and the header floats over it — the design centres the mark
 * and the line on the full viewport rather than on the space below the bar.
 */
export default function CalculatingPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-canvas-tint px-5">
      <SiteHeader />
      <Calculating />
    </main>
  );
}
