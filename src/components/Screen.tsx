import type { ReactNode } from "react";

/**
 * The shell every funnel screen sits in.
 *
 * Phone-first: a full dynamic-viewport column that stays centred and capped on the
 * rare desktop visitor. `dvh` rather than `vh` so the iOS toolbar can't hide the CTA,
 * and safe-area padding so nothing lands under the notch or the home indicator.
 */
export function Screen({
  children,
  footer,
}: {
  children: ReactNode;
  /** Sticky bottom slot — the primary CTA lives here, always thumb-reachable. */
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="mx-auto flex w-full max-w-(--container-funnel) flex-1 flex-col px-(--spacing-gutter) pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex-1">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 bg-canvas pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
