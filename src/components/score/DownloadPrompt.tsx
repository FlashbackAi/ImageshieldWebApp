import Image from "next/image";
import type { Handoff } from "@/lib/handoff";

/**
 * A line of copy, a QR code and the two store badges.
 *
 * The export uses this twice — once inside the warm card under the score, once on
 * the page between the recommendations and the app section — with different copy and
 * different surroundings but the same right-hand block, so that block lives here
 * rather than being written out twice and drifting.
 *
 * The QR comes from `/api/handoff/qr`, a route handler that builds it from the
 * session cookie. It is deliberately NOT `next/image`: the code is generated per
 * visitor and must never be cached, which is exactly what `next/image` would do.
 */
export function DownloadPrompt({
  handoff,
  children,
  compact = false,
  className = "",
}: {
  handoff: Handoff;
  /** The copy to the left of the codes. */
  children: React.ReactNode;
  /**
   * The smaller codes the export uses for the second of the two prompts.
   *
   * Not a style preference: that block's copy is a long sentence set at the same
   * 25px as the first, and it only fits the four lines it is drawn on if the codes
   * beside it give back the ~60px this takes off them.
   */
  compact?: boolean;
  className?: string;
}) {
  /*
   * QR sizes, as the drawn side of the white card — the code inside it is that less
   * the padding either side. The phone export draws 121 and 115 where the desktop
   * one draws 120 and 97, so the phone's two prompts stay barely 6px apart: at 403px
   * the compact one is a whole block of its own rather than a strip beside copy, and
   * shrinking it the way the desktop does would leave it unscannable.
   */
  const qr = compact
    ? "size-[115px] sm:size-[97px]"
    : "size-[121px] sm:size-[120px]";

  /**
   * Badges are matched on WIDTH — 167px of visible badge, one size in both prompts
   * at every breakpoint, which is what the export draws.
   *
   * The two classes below are not the same number because the two PNGs are not
   * built the same. `badge-app-store.png` is full-bleed: its black body fills all
   * 1692×546, so a 167px box is a 167px badge. The Google Play badge carries
   * Google's own clear-space inside the file — its body is 632×182 within a 640×192
   * canvas — so an equal box would draw it 2px narrow. The Play box is therefore
   * scaled by 640/632, and the two visible badges come out the same width.
   *
   * Their heights then differ, 48 against 54, and that is the point: the two lockups
   * are different shapes (3.47:1 against 3.10:1), so one axis has to give. The
   * badges sit STACKED here, one above the other, and a stack is read down its
   * edges — unequal widths leave a ragged right margin that reads as a mistake from
   * across the room, where unequal heights just read as two different logos. That is
   * why this matches widths even though Apple's and Google's own marketing
   * guidelines each ask for equal heights: those guidelines assume the badges sit
   * side by side on one baseline, which is not this layout.
   */
  const appStore = "w-[167px]";
  const play = "w-[169px]";

  return (
    <div
      className={`flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {children}

      {/* The phone centres the second prompt's codes on the page — it has no card
          around it to line them up against, the way the first one does. */}
      <div
        className={`flex shrink-0 items-center ${
          compact ? "mx-auto gap-5 sm:mx-0 sm:gap-3" : "gap-7 sm:gap-4"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- see the note above. */}
        <img
          src="/api/handoff/qr"
          alt="QR code to open ImageShield"
          width={120}
          height={120}
          /* `overflow-hidden` so a QR that fails to load shows a broken-image box
             rather than spilling its alt text across the badges beside it. */
          className={`shrink-0 overflow-hidden rounded-2xl bg-canvas p-3 sm:p-2.5 ${qr}`}
        />

        <div className="flex flex-col gap-3">
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
              className={`h-auto ${play}`}
            />
          </a>
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
              className={`h-auto ${appStore}`}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
