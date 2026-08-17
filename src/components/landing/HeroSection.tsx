import Image from "next/image";
import Link from "next/link";
import { STEP_PATHS } from "@/lib/funnel";
import { HeroNav } from "./HeroNav";

/**
 * Full-bleed hero. V3 swapped the looping ad for a still, so the copy now sits over
 * a fixed frame and the scrim can be tuned to it: a left-to-right wash that lands
 * `scrim` at 64% behind the text and fades to near-nothing over the family.
 *
 * The design frame is 1449×815. The still is a 1024² export placed 1456 wide with
 * its top 162px cropped off, which is what `object-[50%_25%]` reproduces — `cover`
 * scales the square by width and leaves 641px of vertical slack, and 25.2% of that
 * is the 162px the design trims.
 *
 * The band holds that 1449:815 ratio rather than a fixed 815px height, which is what
 * keeps the crop honest: with the height pinned, every extra pixel of width scales
 * the square up and the window onto it shrinks, so by 1920 the photo is blown up
 * past the girls entirely. On the ratio, the visible slice stays 11%–67% of the
 * image at any width — the design's framing exactly. `max-h-svh` is the backstop so
 * a 16:9 band on a wide monitor can't push the CTA below the fold.
 */
export function HeroSection() {
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-night lg:aspect-[1449/815] lg:max-h-svh">
      <Image
        src="/media/hero-family.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_25%]"
      />
      <div className="absolute inset-0 bg-linear-to-l from-black/[0.064] from-[28%] to-scrim/64 to-[97%]" />
      {/* The design's wash runs sideways, which does nothing for copy that spans the
          full width on a phone. Below `lg` a vertical scrim carries the contrast. */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent lg:hidden" />

      <HeroNav />

      <div className="relative z-10 mx-auto flex h-full min-h-[620px] w-full max-w-[1449px] flex-col justify-end px-6 pt-32 pb-16 lg:min-h-0 lg:px-[84px] lg:pb-[100px]">
        <h1 className="max-w-[700px] text-[2rem] leading-tight font-extrabold tracking-tight text-balance text-white sm:text-[2.5rem] lg:max-w-[600px] lg:text-[48px] lg:leading-[60px]">
          What is your <span className="italic">Likeness Health Score</span>
          {/* Service mark, set so its cap line matches the headline's. `leading-none`
              keeps the raised box from growing line two's line box — without it the
              second line lands 2px below where the design puts it. */}
          <sup className="ml-[0.15em] align-[0.83em] text-[0.35em] leading-none italic">
            SM
          </sup>
          ?
        </h1>

        <p className="mt-5 max-w-[620px] text-base leading-relaxed text-white sm:text-lg lg:mt-6 lg:text-xl lg:leading-[30px]">
          Answer a few quick questions and find out how at risk you are of
          deepfakes, impersonation, and photo misuse.
        </p>

        <Link
          href={STEP_PATHS.quiz}
          className="mt-6 flex h-14 w-full max-w-[357px] items-center justify-center rounded-full bg-brand text-lg font-bold text-white transition-colors hover:bg-cta lg:h-16 lg:w-[212px] lg:text-xl"
        >
          Take the Quiz
        </Link>
      </div>
    </section>
  );
}
