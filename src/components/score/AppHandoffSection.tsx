"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { Handoff } from "@/lib/handoff";
import { Eye, Report, ShieldCheck, Wand } from "../funnel/icons";

/**
 * "Download the ImageShield app" — the foot of the result screen, and the only
 * thing on it with somewhere to go.
 *
 * The score is already saved against the phone number the visitor just verified, so
 * there is no token to redeem and nothing to carry across: the handoff is "install
 * the app, sign in with that number". The QR is rendered by `/api/handoff/qr` off
 * the verified cookie rather than built here, so the number in it can't be edited.
 *
 * The feature list is a control, not a static list — the design's comment on the
 * mockup reads "This image can change based on the feature selected", so picking a
 * feature swaps the phone beside it. Built as a vertical tablist: four tabs, one
 * panel, which is what this is even though each tab keeps its own copy visible.
 *
 * Not `<DownloadSection>` from the landing page — that one is the black, centred
 * store-badge footer. This is the design's two-column feature block.
 */

const FEATURES: ReadonlyArray<{
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
  /** The app screen this feature shows off. */
  screen: string;
  /** Describes that screen, since the image is the tab's whole payload. */
  screenAlt: string;
}> = [
  {
    icon: Eye,
    title: "24/7 Monitoring",
    body: "Continuous scanning of the dark web and social platforms for unauthorized use of your likeness.",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    icon: ShieldCheck,
    title: "Privacy Always",
    body: "Your data is encrypted end-to-end. We never sell or share your personal information with third parties.",
    /* TODO: the design only ever produced the dashboard mockup, so the three
       features below borrow it. Each is a one-line swap once its screen exists. */
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    icon: Report,
    title: "Weekly Reports",
    body: "Get a clear summary of your digital footprint and any potential new risk vectors detected.",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    icon: Wand,
    title: "Personalized Recommendations",
    body: "Get personalized recommendations that keep you and your likeness safe",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
];

export function AppHandoffSection({ handoff }: { handoff: Handoff }) {
  /* The design draws the first feature selected, and that is also the only one
     whose mockup exists — so it is the one the section opens on. */
  const [selected, setSelected] = useState(0);
  const ids = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabId = (i: number) => `${ids}-tab-${i}`;
  const panelId = `${ids}-panel`;
  const active = FEATURES[selected];

  /** Arrow keys move between tabs, as a tablist is expected to. */
  function onKeyDown(event: React.KeyboardEvent) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;

    let next = selected;
    if (step) next = (selected + step + FEATURES.length) % FEATURES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = FEATURES.length - 1;
    else return;

    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="download" className="bg-surface px-6 py-20 lg:py-[136px]">
      <div className="mx-auto grid w-full max-w-[1080px] gap-16 lg:grid-cols-[498px_1fr] lg:gap-[159px]">
        <div>
          <h2 className="text-[28px] leading-[38px] font-bold text-ink lg:text-[36px] lg:leading-[48px]">
            Download the ImageShield app and get personalized recommendations
          </h2>

          <p className="mt-10 text-lg leading-8 text-ink-body lg:text-xl lg:leading-8">
            Download the ImageShield App on the App Store, Google Play or scan the
            QR code to protect your likeness.
          </p>

          {/*
           * Every row carries the same border and padding, and only the colours
           * change with selection. The design draws a box on the selected feature
           * alone, but reproducing that literally — padding on one row, none on the
           * others — moves every row below it the moment the selection changes, and
           * steps the icon column sideways as it goes. Sizing them all alike keeps
           * the icons on one line at every state and the list still.
           *
           * The box therefore grows outward into the gap, which is what the design
           * does too: its content-to-content rhythm is a constant ~58px whether or
           * not a box is in the way, so the list gap is that minus the padding.
           */}
          <ul
            role="tablist"
            aria-orientation="vertical"
            aria-label="App features"
            className="mt-10 flex flex-col gap-2 lg:mt-[42px] lg:gap-[18px]"
          >
            {FEATURES.map(({ icon: Icon, title, body }, i) => {
              const on = i === selected;
              return (
                <li key={title}>
                  <button
                    type="button"
                    role="tab"
                    id={tabId(i)}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    aria-selected={on}
                    aria-controls={panelId}
                    /* Roving tabindex: one stop for the whole list, then arrows. */
                    tabIndex={on ? 0 : -1}
                    onClick={() => setSelected(i)}
                    onKeyDown={onKeyDown}
                    /* Hover is a neutral tint, not a weaker purple one: at the 5%
                       the selected row uses, a purple hover is indistinguishable
                       from selection and two rows look chosen at once. */
                    className={`block w-full cursor-pointer rounded-[11px] border-2 px-4 py-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta ${
                      on
                        ? "border-cta bg-cta/5"
                        : "border-transparent hover:bg-ink/[0.04]"
                    }`}
                  >
                    <span
                      className={`flex items-center gap-3 text-lg font-semibold ${
                        on ? "text-cta" : "text-ink"
                      }`}
                    >
                      {/*
                       * The icons are four different sizes, and each draws at its
                       * own. They share a 22px box — the width of the widest — so
                       * their left edges line up and every label starts on the same
                       * column, which resizing them to match would not achieve.
                       */}
                      <span className="flex w-[22px] shrink-0 justify-start">
                        <Icon />
                      </span>
                      {title}
                    </span>
                    {/* Indented past the icon box and its gap, onto the label's column. */}
                    <span className="mt-2 block pl-[34px] text-sm leading-5 text-ink-body">
                      {body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <div id={panelId} role="tabpanel" aria-labelledby={tabId(selected)}>
            <Image
              // Keyed so a swap replaces the element rather than mutating its src,
              // which would otherwise show the old screen until the new one decodes.
              key={active.screen}
              src={active.screen}
              alt={active.screenAlt}
              width={868}
              height={1812}
              className="w-[280px] lg:w-[320px]"
            />
          </div>

          <div className="mt-10 flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element --
                a route handler, not a static asset: it is generated per session and
                must never be cached, which is exactly what `next/image` would do. */}
            <img
              src="/api/handoff/qr"
              alt="QR code to open ImageShield"
              width={97}
              height={97}
              /* `overflow-hidden` so a QR that fails to load shows a broken-image
                 box rather than spilling its alt text across the badges. */
              className="size-[97px] shrink-0 overflow-hidden rounded-2xl border border-line bg-canvas"
            />

            <div className="flex flex-col gap-3">
              <a
                href={handoff.appStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-80"
              >
                <Image
                  src="/media/badge-app-store.png"
                  alt="Download on the App Store"
                  width={1692}
                  height={546}
                  className="w-[127px]"
                />
              </a>
              <a
                href={handoff.playStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-80"
              >
                <Image
                  src="/media/badge-google-play.png"
                  alt="Get it on Google Play"
                  width={640}
                  height={192}
                  className="w-[127px]"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
