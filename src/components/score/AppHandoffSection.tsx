"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

/**
 * "Benefits of the app" — the foot of the result screen.
 *
 * The score is already saved against the phone number the visitor just verified, so
 * there is no token to redeem and nothing to carry across: the handoff is "install
 * the app, sign in with that number". The store badges and the QR now sit further up
 * the page, in the two `DownloadPrompt` blocks — which is why this takes no `handoff`
 * any more: it is purely the pitch, with nothing in it addressed to one visitor.
 *
 * The feature list is a control, not a static list — the design's comment on the
 * mockup reads "This image can change based on the feature selected", so picking a
 * feature swaps the phone beside it. Built as a vertical tablist: four tabs, one
 * panel, which is what this is even though each tab keeps its own copy visible.
 *
 * The LHS Results V1 export draws these as four plain cards beside a fixed mockup,
 * with no selected state — but only ever produced the one app screen, so a static
 * version would be four cards pointing at the same picture. The tabs are kept and
 * restyled to the export's card, ready for the three screens that don't exist yet.
 *
 * Not `<DownloadSection>` from the landing page — that one is the black, centred
 * store-badge footer.
 */

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  /** The app screen this feature shows off. */
  screen: string;
  /** Describes that screen, since the image is the tab's whole payload. */
  screenAlt: string;
}> = [
  {
    title: "Weekly likeness detection reports",
    body: "We scan the entire web (and dark web) for instances of your likeness",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    title: "24/7 Support",
    body: "We're available 24/7 to support you",
    /* TODO: the design only ever produced the dashboard mockup, so the three
       features below borrow it. Each is a one-line swap once its screen exists. */
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    title: "Personalized recommendations",
    body: "Recommendations tailored to your needs to keep your likeness safe",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
  {
    title: "Stalker-proof privacy",
    body: "Our technology ensures that only you can track your face",
    screen: "/media/app-dashboard.png",
    screenAlt: "The ImageShield app showing a household's Likeness Health Scores",
  },
];

export function AppHandoffSection() {
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
    <section
      id="download"
      className="mx-auto w-full max-w-[958px] px-6 pt-16 pb-24 lg:pt-[52px] lg:pb-[120px]"
    >
      {/* The mockup's top edge sits level with the heading rather than with the
          cards, so the heading is inside the left column instead of above the grid. */}
      <div className="grid gap-12 lg:grid-cols-[438px_1fr] lg:gap-[34px]">
        <div>
          <h2 className="text-2xl font-bold text-ink">Benefits of the app</h2>

          {/*
           * The export draws four plain cards with the first one a shade darker.
           * That shade is exactly what a selected tab needs, so the list is still a
           * tablist and the darker card is the selection — every row keeps the same
           * padding and only the ground changes, which is what stops the column
           * shifting as the selection moves.
           */}
          <ul
            role="tablist"
            aria-orientation="vertical"
            aria-label="App features"
            className="mt-8 flex flex-col gap-[25px]"
          >
            {FEATURES.map(({ title, body }, i) => {
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
                    className={`block w-full cursor-pointer rounded-2xl px-[22px] py-[18px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta ${
                      on ? "bg-[#EAEAF2]" : "bg-[#F2F2F7] hover:bg-[#ECECF3]"
                    }`}
                  >
                    <span className="block text-[15px] leading-5 font-bold text-ink">
                      {title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-[19px] text-ink-muted">
                      {body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right-aligned rather than centred in its column: the export runs the
            mockup's right edge to the content column's, and the caption centres
            under the phone rather than under the column. */}
        <div className="flex justify-center lg:justify-end">
          <div className="flex flex-col items-center">
            <div id={panelId} role="tabpanel" aria-labelledby={tabId(selected)}>
              <Image
                // Keyed so a swap replaces the element rather than mutating its
                // src, which would show the old screen until the new one decodes.
                key={active.screen}
                src={active.screen}
                alt={active.screenAlt}
                width={868}
                height={1812}
                className="w-[280px] lg:w-[320px]"
              />
            </div>
            <p className="mt-4 text-[13px] font-bold text-ink">Sample report</p>
          </div>
        </div>
      </div>
    </section>
  );
}
