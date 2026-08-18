/**
 * How a Likeness Health Score is presented.
 *
 * The backend owns the numbers — it scores the answers, picks the band, and returns
 * the per-factor breakdown. Nothing here recomputes any of that; this is the copy,
 * the colours and the gauge geometry that turn its response into the result screen.
 *
 * Client-safe: the screen renders straight from it.
 */

export type RiskLevel = "high" | "moderate" | "low";

/** One entry of the backend's `breakdown` array. */
export type ScoreFactor = {
  factor: string;
  value: string;
  /** Negative, or 0 for a factor that cost nothing. */
  deduction: number;
  description: string;
};

export type ScoreRecord = {
  score: number;
  riskLevel: string;
  breakdown: ScoreFactor[];
  activeReportsCount?: number;
  fullName: string;
};

/**
 * The band boundaries the gauge is labelled with, and the words for each band.
 *
 * These mirror the backend's `getRiskLevelFromScore` (>=80 low, >=51 moderate, else
 * high) so the arc a user sees lit matches the level they were actually given. They
 * are NOT used to decide the band — `riskLevel` comes off the response — only to
 * draw the scale and to fall back if that string is ever missing.
 */
const RISK_BANDS: ReadonlyArray<{
  level: RiskLevel;
  /** Inclusive lower bound of the band, as printed on the gauge. */
  from: number;
  label: string;
}> = [
  { level: "high", from: 0, label: "High" },
  { level: "moderate", from: 50, label: "Moderate" },
  { level: "low", from: 80, label: "Low" },
];

export function riskLevelOf(record: {
  riskLevel?: string;
  score: number;
}): RiskLevel {
  const given = record.riskLevel?.toLowerCase();
  if (given === "high" || given === "moderate" || given === "low") return given;
  // Older records predate riskLevel being stored; derive it the way the backend does.
  return record.score >= 80 ? "low" : record.score >= 51 ? "moderate" : "high";
}

export function riskLabel(level: RiskLevel): string {
  return RISK_BANDS.find((b) => b.level === level)!.label;
}

/* ── Gauge geometry ───────────────────────────────────────────────────────────
 *
 * Measured off the design's 1440-wide export. Angles are SVG degrees — clockwise
 * from three o'clock, because y runs down — so the arc opens at the bottom: it
 * starts at 150° (lower left), climbs over the top, and ends at 390°, i.e. 30°
 * (lower right). 240° of sweep in all.
 *
 * The three bands are NOT proportional to the score ranges they cover — 0–50 is
 * half the scale but under a third of the arc. The design draws them at these
 * angles, and the printed 50 / 80 sit in the gaps, so the labels stay truthful
 * about where each band starts even though the arc is not to scale.
 */
export const GAUGE = {
  /** Centre-line radius of the stroke, and the stroke's own width. */
  radius: 137,
  stroke: 26,
  start: 150,
  end: 390,
  /** Where one band's arc ends and the next begins, before the gap is cut out. */
  breaks: [223.5, 313.5],
  /** Angular slice removed at each break so the bands read as separate segments. */
  gap: 3,
} as const;

/**
 * How far a rounded tip reaches past the centre line it sits on, in degrees.
 *
 * `start` and `end` are where the gauge visually *finishes*, tip included, so the
 * stroke's centre line has to stop short of both by this much — otherwise the cap
 * overshoots the scale and runs into the 0 and 100 printed underneath it.
 */
const TIP_ANGLE = (Math.asin(GAUGE.stroke / 2 / GAUGE.radius) * 180) / Math.PI;

/** Centre-line angle of score 0 and score 100 — the drawn ends, tips excluded. */
const ANGLE_0 = GAUGE.start + TIP_ANGLE;
const ANGLE_100 = GAUGE.end - TIP_ANGLE;

export type GaugeSegmentKey = "0-50" | "50-80" | "80-100";

/**
 * The arc is drawn as a fill from 0 up to the score, split at the band boundaries
 * — not as a highlight of the band the score lands in. Same as the app's gauge, and
 * the reason the design shows the whole 0–50 arc coloured for a score of 49.
 */
export const GAUGE_SEGMENTS: ReadonlyArray<{
  key: GaugeSegmentKey;
  from: number;
  to: number;
}> = [
  { key: "0-50", from: 0, to: 50 },
  { key: "50-80", from: 50, to: 80 },
  { key: "80-100", from: 80, to: 100 },
];

/**
 * Gradient stops per band, top of the gauge → bottom.
 *
 * Copied verbatim from the app's `ScoreGauge.jsx` GAUGE_THEMES so a lead sees the
 * same arc on the web as in the app. The whole gauge takes ONE set, chosen by the
 * score's band; within a set each segment has its own pair. Some stops are
 * deliberately transparent — that is how the app fades the lower segments out — so
 * these are raw values rather than tokens.
 */
export const GAUGE_THEMES: Record<
  RiskLevel,
  Record<GaugeSegmentKey, readonly [string, string]>
> = {
  low: {
    "0-50": ["#39BEB7", "rgba(255,176,32,0.11)"],
    "50-80": ["#39BEB7", "#39BEB7"],
    "80-100": ["#39BEB7", "#39BEB7"],
  },
  moderate: {
    "0-50": ["rgba(255,176,32,0.9)", "rgba(255,176,32,0)"],
    "50-80": ["#FFB020", "rgba(255,176,32,0.7)"],
    "80-100": ["#FFB020", "rgba(255,176,32,0.7)"],
  },
  high: {
    "0-50": ["#DC2626", "#FFB020"],
    "50-80": ["#FF3B5C", "#DC2626"],
    "80-100": ["#FF3B5C", "#DC2626"],
  },
};

/**
 * Where a score sits on the arc.
 *
 * Piecewise, because the three bands don't get arc in proportion to the scores they
 * cover — 0–50 is half the scale but under a third of the sweep. Interpolating
 * inside each band is what keeps the printed 50 and 80 sitting on the boundaries
 * they name.
 */
function scoreToAngle(score: number): number {
  const s = Math.min(Math.max(score, 0), 100);
  const [b50, b80] = GAUGE.breaks;
  if (s <= 50) return ANGLE_0 + (s / 50) * (b50 - ANGLE_0);
  if (s <= 80) return b50 + ((s - 50) / 30) * (b80 - b50);
  return b80 + ((s - 80) / 20) * (ANGLE_100 - b80);
}

/** Centre-line span of the whole track, tips excluded. */
export const GAUGE_TRACK = { from: ANGLE_0, to: ANGLE_100 } as const;

/**
 * How far the fill's rounded end is held back from a band boundary.
 *
 * Without it, a score just short of 50 or 80 puts the tip's centre close enough to
 * the divider that half the disc renders on the far side of the white slot — a
 * detached crumb of colour sitting in the next band. The app's `endClearAngle`,
 * same derivation: half a stroke plus a bit, as an angle at this radius.
 */
const TIP_CLEARANCE =
  (((GAUGE.stroke / 2 + GAUGE.stroke * 0.3) / GAUGE.radius) * 180) / Math.PI;

export type GaugeFill = {
  /** Drawn stretches, in order, each with the gradient key to paint it with. */
  segments: Array<{ key: GaugeSegmentKey; from: number; to: number }>;
  /** Where the rounded start tip goes; null when there is nothing filled. */
  startAngle: number | null;
  /**
   * Where the rounded end tip goes, or null when the fill stops flush on a band
   * boundary — there the divider is the end, and a tip would spill past it.
   */
  endAngle: number | null;
  endKey: GaugeSegmentKey;
};

/** Resolves a score into the arcs and tips the gauge draws. */
export function gaugeFill(score: number): GaugeFill {
  const value = Math.min(Math.max(score, 0), 100);
  const filled = GAUGE_SEGMENTS.filter((seg) => value > seg.from);
  const active = filled[filled.length - 1];

  if (!active) {
    return {
      segments: [],
      startAngle: null,
      endAngle: null,
      endKey: GAUGE_SEGMENTS[0].key,
    };
  }

  const boundary = active.to < 100;
  /* Sitting exactly on 50 or 80: the band is full, so it ends against the divider
     with a square edge rather than a tip. */
  const flush = boundary && value >= active.to;

  let end = scoreToAngle(Math.min(value, active.to));
  if (boundary && !flush) {
    end = Math.min(end, scoreToAngle(active.to) - TIP_CLEARANCE);
  }

  return {
    segments: filled.map((seg) => ({
      key: seg.key,
      from: scoreToAngle(seg.from),
      to: seg === active ? end : scoreToAngle(seg.to),
    })),
    startAngle: scoreToAngle(0),
    endAngle: flush ? null : end,
    endKey: active.key,
  };
}

/** A point on the gauge's centre line, in a viewBox centred on the arc. */
/* `radius` is annotated, not just defaulted: `GAUGE` is `as const`, so inferring
   from the default would narrow the parameter to the literal 137. */
export function gaugePoint(degrees: number, radius: number = GAUGE.radius) {
  const rad = (degrees * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

/* ── What affected your score ────────────────────────────────────────────────
 *
 * The design shows three cards — Age, Gender, Privacy Settings — but a real
 * breakdown has up to seven factors and which ones matter is different for every
 * lead. So the cards are filled from the breakdown's three biggest deductions and
 * this table supplies the icon and the sentence for whichever ones turn up.
 *
 * Keys are the backend's `factor` strings verbatim (server.js
 * calculateLikenessScoreWithReports). A factor with no entry falls back to the
 * backend's own `description`, which is written for the app's detail screen.
 */
export type FactorIcon =
  | "calendar"
  | "venus"
  | "globe"
  | "eye"
  | "report"
  | "shield"
  | "wand";

const FACTOR_PRESENTATION: Record<
  string,
  { title: string; icon: FactorIcon; description: string }
> = {
  Age: {
    title: "Age",
    icon: "calendar",
    description:
      "Your demographic profile shows a higher frequency of targeted likeness harvesting.",
  },
  Gender: {
    title: "Gender",
    icon: "venus",
    description:
      "Statistical models indicate specific risk vectors based on gender-based deepfake trends.",
  },
  "Profile Visibility": {
    title: "Privacy Settings",
    icon: "globe",
    description:
      "Current social media exposure levels provide significant training data for unauthorized AI models.",
  },
  "Content Type": {
    title: "Content Type",
    icon: "eye",
    description:
      "The kind of content you share changes how valuable your likeness is to the people collecting it.",
  },
  "Content Quantity": {
    title: "Content Volume",
    icon: "wand",
    description:
      "Every image you post online widens the pool of source material a model can be trained on.",
  },
  "Past Exploitation": {
    title: "Past Exploitation",
    icon: "shield",
    description:
      "No known history of your likeness being misused, which keeps your exposure lower.",
  },
  "Past Exploitation (Resolved)": {
    title: "Past Exploitation",
    icon: "shield",
    description:
      "Your likeness has been misused before. It was taken down, but a prior incident raises your risk.",
  },
  "Past Exploitation (Active)": {
    title: "Past Exploitation",
    icon: "shield",
    description:
      "Your likeness has been misused and the content is still live, which is the single largest risk factor.",
  },
  "Active Reports": {
    title: "Active Reports",
    icon: "report",
    description:
      "Open reports on your account mean your likeness is being misused right now.",
  },
};

/** The three cards the design has room for: whatever cost the most points. */
export function topFactors(breakdown: ScoreFactor[], count = 3) {
  return [...breakdown]
    .filter((f) => f.deduction < 0)
    .sort((a, b) => a.deduction - b.deduction)
    .slice(0, count)
    .map((f) => {
      const preset = FACTOR_PRESENTATION[f.factor];
      return {
        key: f.factor,
        title: preset?.title ?? f.factor,
        icon: preset?.icon ?? "shield",
        description: preset?.description ?? f.description,
      };
    });
}
