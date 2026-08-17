"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HERO_NAV } from "@/lib/site-nav";
import { Close, Menu } from "./icons";

/**
 * V3's floating glass bar, over the landing hero only.
 *
 * Measured off the 1449-wide design: 20px down, 38px in from either edge, 79px tall
 * with a 16px radius, filled `ink-soft` at 20% over a 10px backdrop blur. Inside,
 * the logo is 24px from the left edge and the link row ends 32px from the right,
 * 32px between links.
 *
 * This is deliberately not `SiteHeader`. The glass reads as glass because there's a
 * photograph behind it — every funnel screen is a near-white canvas, where white on
 * a 20% scrim is unreadable, so those keep the solid V1 bar.
 *
 * Six 16px links plus the logo need ~750px, so they only collapse behind a
 * disclosure under `lg` (the design only specifies desktop).
 */
export function HeroNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-20 pt-3 lg:pt-5">
      <div className="mx-auto max-w-[1449px] px-4 sm:px-6 lg:px-[38px]">
        <div className="flex h-16 items-center justify-between rounded-2xl bg-ink-soft/20 pr-2 pl-4 backdrop-blur-[10px] lg:h-[79px] lg:pr-8 lg:pl-6">
          <Link href="/" aria-label="ImageShield home" className="shrink-0">
            <Image
              src="/media/logo-wordmark.svg"
              alt="ImageShield"
              width={178}
              height={40}
              priority
              className="h-8 w-auto lg:h-10"
            />
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {HERO_NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-base text-ink-onnight transition-opacity hover:opacity-70"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="hero-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-tap items-center justify-center text-ink-onnight lg:hidden"
          >
            {open ? <Close className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {open ? (
          <nav
            id="hero-nav"
            aria-label="Main"
            /* The bar's own 20% fill is a highlight over the photo; a panel of links
               has to be a surface, so the disclosure takes the same material at a
               weight the copy can be read against. */
            className="mt-2 rounded-2xl bg-ink-soft/80 py-2 backdrop-blur-[10px] lg:hidden"
          >
            <ul className="flex flex-col px-4">
              {HERO_NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-tap items-center text-base text-ink-onnight"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
