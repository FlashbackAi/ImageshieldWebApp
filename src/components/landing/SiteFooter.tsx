import Image from "next/image";
import {
  LEGACY_PLATFORM_URL,
  LEGAL_LINKS,
  SOCIAL_LINKS,
  TRUSTE_SEAL,
} from "@/lib/site-nav";
import { Facebook, Instagram, LinkedIn, Twitter, YouTube } from "./icons";

const SOCIAL_ICONS = {
  Facebook,
  X: Twitter,
  Instagram,
  LinkedIn,
  YouTube,
} as const;

/**
 * The old site's footer, which every page on imageshield.com carries.
 *
 * Only /faq mounts it here. The V3 landing page ends on `DownloadSection` instead —
 * that section is the new design's answer to this one, and the two would read as
 * two footers stacked. So this stays scoped to the pages copied over from the old
 * site until a V3 footer exists.
 *
 * The logo is the colour mark rather than the white one `SiteHeader` uses: this
 * band is a light surface, and the white mark disappears on it.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line-legacy/50 bg-surface-legacy/50 py-12">
      <div className="mx-auto flex w-full max-w-[1536px] flex-col items-center gap-8 px-4">
        <a
          href={TRUSTE_SEAL.validation}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TRUSTe Privacy Certification"
        >
          {/* TrustArc serves the seal itself, and it has to be loaded from their
              host for the certification to stand — so it cannot go through
              next/image, which would proxy and cache it. Its dimensions are
              theirs to change too, hence no width/height. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TRUSTE_SEAL.image} alt="TRUSTe" style={{ border: "none" }} />
        </a>

        <Image
          src="/media/logo-color.png"
          alt="ImageShield"
          width={193}
          height={56}
          className="h-12 w-auto"
        />

        <ul className="flex gap-6">
          {SOCIAL_LINKS.map((social) => {
            const Icon = SOCIAL_ICONS[social.label];
            return (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="block text-ink-muted transition-colors hover:text-ink-legacy"
                >
                  <Icon className="size-6" />
                </a>
              </li>
            );
          })}
        </ul>

        <a
          href={LEGACY_PLATFORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-md bg-ink-legacy px-4 py-2 text-sm font-bold whitespace-nowrap text-ink-inverse shadow-legacy transition-colors hover:bg-ink-legacy/90 hover:shadow-legacy-hover"
        >
          Access Legacy Web Platform
        </a>

        <ul className="flex flex-wrap items-center justify-center gap-6 text-sm text-ink-muted">
          {LEGAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                {...(link.href.startsWith("mailto:")
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
                className="transition-colors hover:text-ink-legacy"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="text-sm text-ink-muted">
          © 2026 ImageShield. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
