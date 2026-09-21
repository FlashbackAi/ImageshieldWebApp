import { RISK_LEGEND } from "@/lib/score";

/**
 * The key printed under the gauge: three bands, each with its colour and its range.
 *
 * New in the LHS Results V1 export, and it replaces the "High Risk" / "Low Risk"
 * captions that used to sit inside the drawing under the 0 and 100 ticks. Moving it
 * out is what lets it name all three bands rather than only the two ends — and it
 * puts the ranges on the page, which is the thing that makes a bare 43 legible.
 *
 * Deliberately not a legend for the SCORE: nothing here is highlighted for the band
 * the visitor landed in. It is a scale, the same for everyone, which is why the arc
 * above it and the headline beside it are left to say where this person sits.
 *
 * A plain grid rather than a list, because the three rules have to sit on one line
 * across the gauge's width whatever the labels underneath do.
 *
 * The phone export draws the same three columns wider than the arc above them —
 * 100px each on a 403px frame — and sets the range in light grey rather than the
 * desktop's bold ink, so the label is what the eye lands on and the numbers read as
 * the footnote they are. Both are mobile-only: the desktop measurements beside them
 * are the ones taken off the desktop export.
 */
export function ScoreScale() {
  return (
    <div className="mx-auto grid max-w-[310px] grid-cols-3 gap-x-[5px] sm:max-w-none sm:gap-x-1.5">
      {RISK_LEGEND.map((band) => (
        <div key={band.level}>
          {/* The rule is the swatch. Painted from a CSS variable rather than a
              Tailwind class, since an interpolated `bg-risk-${level}` is never
              generated — the scanner only sees whole class names. */}
          <div
            aria-hidden
            className="h-[3px] w-full rounded-full sm:h-0.5"
            style={{ backgroundColor: band.colour }}
          />
          <p className="mt-[7px] text-center text-[13px] leading-4 text-ink-soft sm:mt-3.5 sm:text-ink-muted">
            {band.label}
          </p>
          <p className="mt-2 text-center text-[13px] leading-4 text-ink-faint sm:mt-1.5 sm:text-sm sm:font-bold sm:text-ink">
            {band.range}
          </p>
        </div>
      ))}
    </div>
  );
}
