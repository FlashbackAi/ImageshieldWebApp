import Image from "next/image";
import Link from "next/link";
import { STEP_PATHS } from "@/lib/funnel";
import { HeroNav } from "./HeroNav";

/**
 * Full-bleed hero, drawn from two frames: 1449×815 desktop and 390×586 mobile.
 *
 * They are art-directed differently, and `hero-family.jpg` is cut to serve both. The
 * design's export is 1926×1076; desktop's frame lands x 77–1855 and y 0–1000 of it,
 * mobile's lands x 148–864 and the full height. The asset is the union — x 77–1855
 * at full height, 1778×1076 — so each breakpoint is a plain `cover` plus a position:
 *
 *   desktop  `cover` scales 1449/1778 = 0.815, the design's exact scale, giving 877px
 *            of height in an 815px band — so `object-top` drops the 62px overflow off
 *            the bottom where the design drops it.
 *   mobile   `cover` scales 586/1076 = 0.545, again the design's, showing the full
 *            height and 716 of the 1778 columns. The design starts that window at
 *            asset x 71, which is 6.66% of the 1062px of horizontal slack — hence
 *            `object-[6.66%_50%]`, and why the phone gets the mother and the girl
 *            rather than the two children a centred crop would land on.
 *
 * Mobile carries a flat 40% black over the whole photo, which is what the design
 * draws; desktop has no wash at all — it's a dusk shot and the copy block sits at a
 * mean luminance of 57/255, so both frames leave a 12% drop shadow to do the work.
 *
 * Desktop holds the 1449:815 ratio rather than a fixed 815px height, which is what
 * keeps the framing honest: on a pinned height every extra pixel of width scales the
 * photo up and the window onto it shrinks, so by 1920 it's blown up past the family.
 * The `min()` caps the band at the viewport so the CTA can't be pushed below the fold.
 *
 * The ratio is a height rather than `aspect-[1449/815]` on purpose. A `max-height`
 * on an aspect-ratio box transfers back through the ratio into a max-WIDTH, so
 * `aspect-[1449/815] max-h-svh` quietly caps the hero at `viewport height × 1.778`
 * and leaves the page's black canvas showing down the right-hand side of any
 * monitor wider than that — 1760px on a 990px-tall window. Sizing the one axis we
 * mean to constrain keeps the section full-bleed at every width.
 */
export function HeroSection() {
  return (
    <section className="relative isolate min-h-[586px] overflow-hidden bg-night lg:h-[min(56.246vw,100svh)]">
      <Image
        src="/media/hero-family.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[6.66%_50%] lg:object-top"
      />
      <div className="absolute inset-0 bg-black/40 lg:hidden" />

      <HeroNav />

      {/* The 84px left inset is measured from the viewport, not from a centred 1449
          container — see `HeroNav`, whose 35px is held the same way so the logo keeps
          sitting 49px to the left of the headline at any width. The headline and
          paragraph carry their own max-widths, so the measure stays the design's. */}
      <div className="relative z-10 flex h-full min-h-[586px] w-full flex-col justify-end px-6 pt-32 pb-10 drop-shadow-[0_4px_4px_rgb(0_0_0/0.12)] lg:min-h-0 lg:px-[84px] lg:pb-[100px]">
        {/* `text-balance` only from `lg`: the mobile frame breaks after "Likeness",
            and balancing a 342px measure pulls "Health" up onto line one instead. */}
        <h1 className="max-w-[700px] text-[1.8rem] leading-[38px] font-extrabold tracking-tight text-white sm:text-[2.5rem] sm:leading-tight lg:max-w-[600px] lg:text-[48px] lg:leading-[60px] lg:text-balance">
          What is your <span className="italic">Likeness Health Score</span>
          {/* Service mark, set so its cap line matches the headline's. `leading-none`
              keeps the raised box from growing line two's line box — without it the
              second line lands 2px below where the design puts it. */}
          <sup className="ml-[0.15em] align-[0.83em] text-[0.35em] leading-none italic">
            SM
          </sup>
          ?
        </h1>

        <p className="mt-[6px] max-w-[620px] text-base leading-6 text-white sm:text-lg sm:leading-relaxed lg:mt-6 lg:text-xl lg:leading-[30px]">
          Answer a few quick questions and find out how at risk you are of
          deepfakes, impersonation, and photo misuse.
        </p>

        {/* Both frames draw the same 212×64 pill at the same 20px label — the phone
            does not get a full-width button. */}
        <Link
          href={STEP_PATHS.quiz}
          className="mt-7 flex h-16 w-[212px] items-center justify-center rounded-full bg-brand text-xl font-bold text-white transition-colors hover:bg-cta lg:mt-6"
        >
          Take the Quiz
        </Link>
      </div>
    </section>
  );
}
