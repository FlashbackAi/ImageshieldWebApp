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

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:mt-[35px]">
        <a
          href={STORE_LINKS.appStore}
          target="_blank"
          rel="noreferrer"
          className="flex h-[79px] w-[226px] items-center justify-center rounded-[11px] border-2 border-white transition-opacity hover:opacity-80"
        >
          <Image
            src="/media/badge-app-store.png"
            alt="Download on the App Store"
            width={1692}
            height={546}
            className="w-[197px]"
          />
        </a>
        <a
          href={STORE_LINKS.googlePlay}
          target="_blank"
          rel="noreferrer"
          className="flex h-[79px] items-center transition-opacity hover:opacity-80"
        >
          <Image
            src="/media/badge-google-play.png"
            alt="Get it on Google Play"
            width={640}
            height={192}
            className="w-[208px]"
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
