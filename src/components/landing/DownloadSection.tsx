import Image from "next/image";
import { SOCIAL_LINKS, STORE_LINKS } from "@/lib/site-nav";
import {
  Facebook,
  Instagram,
  LinkedIn,
  Shield,
  Star,
  Twitter,
  YouTube,
} from "./icons";

const SOCIAL_ICONS = {
  Facebook,
  X: Twitter,
  Instagram,
  LinkedIn,
  YouTube,
} as const;

const TRUST_MARKERS = [
  "Patented Technology",
  "Complete Privacy",
  "24/7 Monitoring for Potential Dangers",
];

/** Store badges, social links and trust markers — the foot of the page. */
export function DownloadSection() {
  return (
    <section
      id="download"
      className="flex flex-col items-center bg-night px-6 pt-16 pb-24 lg:pt-[69px] lg:pb-[203px]"
    >
      {/*
       * Stacks on a phone — the label wraps to two lines beside the rule otherwise.
       * The nudge reproduces the design, where this row alone sits 22px right of the
       * page centre that every other row is aligned to.
       */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6 lg:translate-x-[22px]">
        <div className="flex text-star" role="img" aria-label="Rated 5 out of 5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="size-5" />
          ))}
        </div>
        <span aria-hidden className="hidden h-4 w-px bg-white/30 sm:block" />
        <p className="text-sm font-semibold text-ink-onnight">
          Thousands of Families Protected
        </p>
      </div>

      {/*
       * The design draws the two badges mismatched — the App Store box at 226×79
       * against Google Play's 208×62 — and their artwork is 2.86:1 against 3.33:1, so
       * no single size fits both. Which axis they match on is what makes them read as
       * a pair, and that flips with the layout:
       *
       * Side by side, they share a HEIGHT of 62px and each keeps its own width; a
       * shared width would sit them on mismatched baselines. Stacked on a phone it is
       * the reverse — the edges line up vertically, so 30px of extra width on Google
       * Play is the whole mismatch — so both take a WIDTH of 208px (Google Play's own,
       * the width 62px of height was already giving it) and each keeps its own height.
       * `aspect` carries the App Store box's proportions either way, so whichever axis
       * is pinned drives the other and its artwork never distorts.
       *
       * Hovering scales by 79/62, which lands that box back on exactly the 226×79 the
       * design gives it. It's a transform rather than a height so the row doesn't
       * reflow. The row gap goes to 32px, a step over the design's 24: Google Play
       * grows 28px to each side, so at 24 the hovered badge lands on top of its
       * neighbour. `z-10` is belt-and-braces for the same reason. Stacked, the 16px
       * gap already clears the 10px that same scale adds above and below.
       */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-8 lg:mt-[35px]">
        <a
          href={STORE_LINKS.appStore}
          target="_blank"
          rel="noreferrer"
          className="relative flex aspect-[226/79] w-[208px] items-center justify-center rounded-[11px] border-2 border-white transition-transform duration-200 hover:z-10 hover:scale-[1.274] focus-visible:z-10 focus-visible:scale-[1.274] sm:h-[62px] sm:w-auto"
        >
          <Image
            src="/media/badge-app-store.png"
            alt="Download on the App Store"
            width={1692}
            height={546}
            className="w-[87%]"
          />
        </a>
        <a
          href={STORE_LINKS.googlePlay}
          target="_blank"
          rel="noreferrer"
          className="relative flex w-[208px] items-center transition-transform duration-200 hover:z-10 hover:scale-[1.274] focus-visible:z-10 focus-visible:scale-[1.274] sm:h-[62px] sm:w-auto"
        >
          <Image
            src="/media/badge-google-play.png"
            alt="Get it on Google Play"
            width={640}
            height={192}
            className="w-full sm:h-full sm:w-auto"
          />
        </a>
      </div>

      <p className="mt-8 text-sm text-ink-onnight-dim lg:mt-[33px]">
        Free to download • Start your protection today
      </p>

      <ul className="mt-6 flex items-center gap-6 lg:mt-[21px]">
        {SOCIAL_LINKS.map((social) => {
          const Icon = SOCIAL_ICONS[social.label];
          return (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                // 24px on the grid, but `after` stretches the hit area to 44px so
                // the icons stay 24px apart the way the design has them.
                className="relative block size-6 text-white/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-white"
              >
                <Icon className="size-6" />
              </a>
            </li>
          );
        })}
      </ul>

      <ul className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-8 lg:mt-[18px]">
        {TRUST_MARKERS.map((marker) => (
          <li
            key={marker}
            className="flex items-center gap-[9px] text-sm text-ink-onnight-faint"
          >
            <Shield className="size-4 shrink-0 text-accent-bright" />
            {marker}
          </li>
        ))}
      </ul>
    </section>
  );
}
