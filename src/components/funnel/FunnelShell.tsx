import type { ReactNode } from "react";
import { SiteHeader } from "@/components/landing/SiteHeader";

/**
 * The shell the details and OTP screens share.
 *
 * Still the marketing site rather than the funnel proper — same reasoning as the
 * quiz intro, so this doesn't reach for `<Screen>` either: the site header stays,
 * the canvas stays full width, and only the column underneath is funnel-shaped.
 *
 * Measured off the 1920×1271 details export: a 560px column centred on the page,
 * its heading 179px below the 65px header, everything inside it flush left. The
 * design draws desktop only; the top gap collapses on smaller screens, where
 * 179px of nothing would push the first field off a phone.
 */
export function FunnelShell({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-[100dvh] bg-canvas-tint">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[600px] px-5 pt-[65px]">
        <div className="pt-12 pb-24 sm:pt-24 lg:pt-[179px]">
          {/* 28/40 on the design. It steps down to the quiz screens' 24/36 on a
              phone, where 28px runs the second line to four words. */}
          <h1 className="text-2xl leading-9 font-bold text-ink sm:text-[28px] sm:leading-10">
            {title}
          </h1>

          <p className="mt-5 text-sm text-ink/45">{subtitle}</p>

          {children}
        </div>
      </div>
    </main>
  );
}
