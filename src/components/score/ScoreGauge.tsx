import {
  GAUGE,
  GAUGE_SEGMENTS,
  GAUGE_THEMES,
  GAUGE_TRACK,
  gaugeFill,
  gaugePoint,
  type RiskLevel,
} from "@/lib/score";

/**
 * The arc at the top of the result screen.
 *
 * A fill, not a band highlight: it runs from 0 up to the score, cut at the 50 and 80
 * boundaries so each stretch can take its own gradient. The whole gauge picks one
 * colour set from the score's band. Both the geometry and the gradients are the
 * app's `ScoreGauge` — its `report` variant, whose angles (211.11° / 136.83° /
 * 45.83° / −28.70°, measured anticlockwise) are the same arc this screen's export
 * was drawn from.
 *
 * Drawn in a viewBox centred on the arc's own centre, so the geometry is just radii
 * and angles. The labels are part of the drawing rather than HTML around it, so the
 * whole thing scales as one piece instead of reflowing at small widths.
 */

/**
 * Scale labels, positioned as measured off the design rather than derived.
 *
 * The two middle ticks are pushed radially out of their gaps, but 0 and 100 are not
 * — they sit directly *under* the arc's tips, inside the outer radius. One formula
 * can't produce both, so these are points.
 *
 * The "High Risk" / "Low Risk" captions that used to sit under 0 and 100 are gone:
 * the LHS Results V1 export moves that key out of the drawing and into the printed
 * scale below the whole gauge, where it can name all three bands and their ranges
 * rather than only the two ends. See `ScoreScale`.
 */
const TICKS: ReadonlyArray<{ value: string; x: number; y: number }> = [
  { value: "0", x: -118, y: 85 },
  { value: "50", x: -127, y: -129.5 },
  { value: "80", x: 127, y: -129.5 },
  { value: "100", x: 118, y: 78 },
];

/**
 * Width of the white slot cut at each band boundary.
 *
 * The app draws a 4px divider on a 72.28 radius; this gauge is 137, so the same
 * slot subtends the same angle at 7.6px. That lands on the ~3° gaps measured in
 * the export, which is the same thing drawn a different way.
 */
const DIVIDER = 7.6;

function arcPath(from: number, to: number): string {
  const start = gaugePoint(from);
  const end = gaugePoint(to);
  const large = to - from > 180 ? 1 : 0;
  return `M${start.x} ${start.y} A${GAUGE.radius} ${GAUGE.radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

/**
 * A rounded end of the fill, as a mask shape.
 *
 * Only the fill's two ends are round; where it crosses a band boundary it must stay
 * square, which `stroke-linecap` cannot express — it rounds both ends of a path. So
 * the tip is a disc dropped on the arc's centre line instead.
 *
 * White, because it is only ever drawn inside a mask — see the note there.
 */
function Tip({ degrees }: { degrees: number }) {
  const at = gaugePoint(degrees);
  return <circle cx={at.x} cy={at.y} r={GAUGE.stroke / 2} fill="#fff" />;
}

/**
 * The viewBox, repeated as numbers for the mask and the panel it reveals.
 *
 * 240 tall rather than 256: with the risk captions moved out to `ScoreScale`, the
 * lowest thing drawn is the 0 / 100 tick row, and the leftover strip underneath was
 * pushing the printed scale away from the arc it belongs to.
 */
const BOX = { x: -150, y: -150, width: 300, height: 240 } as const;

export function ScoreGauge({
  score,
  level,
  band,
}: {
  score: number;
  /** Which of the three DRAWN bands to colour the arc in. */
  level: RiskLevel;
  /** The band string the API served, for the accessible name. Passed rather than
   *  derived from `level` so a screen reader hears the same words a sighted visitor
   *  reads — the API has four bands and this scale draws three, so `level` alone
   *  would announce "high risk" for a score the response called "severe risk". */
  band: string;
}) {
  const value = Math.min(Math.max(score, 0), 100);
  const theme = GAUGE_THEMES[level];
  const fill = gaugeFill(value);

  const ref = (key: string) => `url(#gauge-${level}-${key})`;

  return (
    <svg
      /* x spans the full outer diameter; y stops just under the lower captions. */
      viewBox="-150 -150 300 240"
      role="img"
      aria-label={`Likeness Health Score ${value} out of 100 — ${band}`}
      className="w-full"
    >
      <defs>
        {/* Vertical across the gauge, as the app defines them: y1 = cy − R, y2 = cy + R. */}
        {GAUGE_SEGMENTS.map((seg) => (
          <linearGradient
            key={seg.key}
            id={`gauge-${level}-${seg.key}`}
            x1="0"
            y1={-GAUGE.radius}
            x2="0"
            y2={GAUGE.radius}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={theme[seg.key][0]} />
            <stop offset="1" stopColor={theme[seg.key][1]} />
          </linearGradient>
        ))}
      </defs>

      {/* Unfilled track, round-capped at both ends of the scale. */}
      <path
        d={arcPath(GAUGE_TRACK.from, GAUGE_TRACK.to)}
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth={GAUGE.stroke}
        strokeLinecap="round"
      />

      {/*
       * Each band is masked rather than stroked directly, because several of the
       * app's gradient stops are semi-transparent. A rounded tip is a separate disc
       * sitting on the end of the arc (linecap can't round one end only), and two
       * translucent shapes stacked composite twice — which showed up as a darker,
       * more saturated blob exactly where the tip overlapped the stroke. Painting
       * the gradient once through the union of arc + tips keeps every pixel to a
       * single pass.
       */}
      {fill.segments.map((seg) => {
        const maskId = `gauge-mask-${level}-${value}-${seg.key}`;
        return (
          <g key={seg.key}>
            <mask id={maskId} maskUnits="userSpaceOnUse" {...BOX}>
              <path
                d={arcPath(seg.from, seg.to)}
                fill="none"
                stroke="#fff"
                strokeWidth={GAUGE.stroke}
                strokeLinecap="butt"
              />
              {seg.key === GAUGE_SEGMENTS[0].key && fill.startAngle !== null ? (
                <Tip degrees={fill.startAngle} />
              ) : null}
              {seg.key === fill.endKey && fill.endAngle !== null ? (
                <Tip degrees={fill.endAngle} />
              ) : null}
            </mask>
            <rect {...BOX} fill={ref(seg.key)} mask={`url(#${maskId})`} />
          </g>
        );
      })}

      {/* Slots at the 50 and 80 boundaries, cut through track and fill alike — the
          app draws the bands as one continuous arc and divides it the same way. */}
      {GAUGE.breaks.map((degrees) => {
        const inner = gaugePoint(degrees, GAUGE.radius - GAUGE.stroke / 2 - 1);
        const outer = gaugePoint(degrees, GAUGE.radius + GAUGE.stroke / 2 + 1);
        return (
          <line
            key={degrees}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--color-canvas)"
            strokeWidth={DIVIDER}
          />
        );
      })}

      {/* The numeral sits a little above the arc's centre, where the design puts it. */}
      {/* 110 units in a 300-unit box, drawn 191px wide — so ~70px on the page, which
          is the cap height the export measures. It was 80 units when this gauge was
          drawn at its full 300px; the arc has since been laid out beside the headline
          at two thirds that size, and a numeral that scaled with it would have come
          out too small to read as the screen's headline number. */}
      <text x="0" y="31" textAnchor="middle" className="fill-ink text-[110px] font-bold">
        {value}
      </text>

      {/* 20 units, i.e. ~13px at the drawn width — same reasoning as the numeral. */}
      {TICKS.map((tick) => (
        <text
          key={tick.value}
          x={tick.x}
          y={tick.y}
          textAnchor="middle"
          className="fill-ink-muted text-[20px]"
        >
          {tick.value}
        </text>
      ))}
    </svg>
  );
}
