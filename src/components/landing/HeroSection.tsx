import Link from "next/link";
import { STEP_PATHS } from "@/lib/funnel";
import { HeroVideo } from "./HeroVideo";
import { SiteHeader } from "./SiteHeader";

/**
 * Full-bleed hero: the ad loops underneath, a 50% black scrim keeps the copy
 * legible over whatever frame happens to be on screen, and the text never moves.
 *
 * The design frame is 1449×815 — exactly 16:9, so at that width the clip fills the
 * band with no crop. Wider viewports crop it top and bottom rather than letterbox.
 */
export function HeroSection() {
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-night lg:h-[815px]">
      <HeroVideo />
      <div className="absolute inset-0 bg-black/50" />

      <SiteHeader />

      <div className="relative z-10 mx-auto flex h-full min-h-[620px] w-full max-w-[1449px] flex-col justify-end px-6 pt-32 pb-16 lg:min-h-0 lg:px-[84px] lg:pb-[100px]">
        <h1 className="max-w-[700px] text-[2rem] leading-[1.15] font-extrabold tracking-tight text-balance text-white sm:text-[2.75rem] lg:text-[60px] lg:leading-[72px]">
          What is your <span className="italic">Likeness Health Score</span>
          {/* Service mark, set so its cap line matches the headline's. */}
          <sup className="ml-[0.15em] align-[0.83em] text-[0.35em] italic">SM</sup>?
        </h1>

        <p className="mt-5 max-w-[620px] text-base leading-relaxed text-white sm:text-lg lg:mt-6 lg:text-2xl lg:leading-9">
          Answer a few quick questions and find out how at risk you are of
          deepfakes, impersonation, and photo misuse.
        </p>

        <Link
          href={STEP_PATHS.quiz}
          className="mt-8 flex h-14 w-full max-w-[357px] items-center justify-center rounded-full bg-cta text-lg font-bold text-white transition-colors hover:bg-brand-bright lg:mt-[25px] lg:h-[82px] lg:text-2xl"
        >
          Take the Quiz
        </Link>
      </div>
    </section>
  );
}
