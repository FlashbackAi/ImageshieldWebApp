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
  const qr = compact ? 97 : 120;
  const badge = compact ? "w-[130px]" : "w-[166px]";
  return (
    <div
      className={`flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {children}

      <div className={`flex shrink-0 items-center ${compact ? "gap-3" : "gap-4"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- see the note above. */}
        <img
          src="/api/handoff/qr"
          alt="QR code to open ImageShield"
          width={qr}
          height={qr}
          /* `overflow-hidden` so a QR that fails to load shows a broken-image box
             rather than spilling its alt text across the badges beside it. */
          style={{ width: qr, height: qr }}
          className="shrink-0 overflow-hidden rounded-2xl bg-canvas p-2.5"
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
              className={badge}
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
              className={badge}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
