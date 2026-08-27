import { SiteHeader } from "@/components/landing/SiteHeader";
import type { Handoff } from "@/lib/handoff";
import {
  bandLabel,
  type FactorIcon,
  riskLevelOf,
  type RiskLevel,
  type ScoreRecord,
  topFactors,
} from "@/lib/score";
import { Calendar, Globe, Report, ShieldCheck, Venus, Wand, Eye } from "../funnel/icons";
import { AppHandoffSection } from "./AppHandoffSection";
import { ScoreGauge } from "./ScoreGauge";

/**
 * The accent colour on the risk word, per band.
 *
 * Written out rather than built as `text-risk-${level}` — Tailwind scans source for
 * whole class names, and an interpolated one is never generated.
 */
const RISK_WORD: Record<RiskLevel, string> = {
  high: "text-risk-high",
  moderate: "text-risk-moderate",
  low: "text-risk-low",
};

const FACTOR_ICONS: Record<FactorIcon, (props: { className?: string }) => React.ReactElement> = {
  calendar: Calendar,
  venus: Venus,
  globe: Globe,
  eye: Eye,
  report: Report,
  shield: ShieldCheck,
  wand: Wand,
};

/**
 * The result screen. Everything on it comes off the stored record.
 *
 * `prompts` maps a breakdown key to the question it was asked as, from the same quiz
 * definition the visitor answered. It is only a fallback: a factor the presentation
 * table recognises gets the marketing copy, and one it doesn't gets the real question
 * instead of a raw key like `content_type`.
 */
export function ScoreResult({
  record,
  handoff,
  prompts,
}: {
  record: ScoreRecord;
  handoff: Handoff;
  prompts?: ReadonlyMap<string, string>;
}) {
  const { score } = record;
  const level = riskLevelOf(score);
  /* The band the API served, rendered as it came. Not derived from the number: the
     API owns the thresholds and says so, and this screen's drawn scale deliberately
     doesn't match them (see ../../lib/score.ts). */
  const label = bandLabel(score);
  const factors = topFactors(score.breakdown.quiz, prompts);
  /* The score is a health score — 100 is safest — so the share of comparable people
     who have been hit reads as its complement. The API does not supply a real cohort
     figure; the design hardcodes "50%" beside a score of 49, which is what this
     reproduces. Swap it the moment there is a number to swap it for. */
  const cohort = 100 - score.live;
  const firstName = record.firstName;

  return (
    /* Inter, like the rest of the marketing site — and the headline needs a real
       italic cut for "High", which the funnel's Plus Jakarta Sans isn't loaded with. */
    <main className="relative min-h-[100dvh] bg-canvas font-site">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-6 pt-[65px] text-center">
        <h1 className="mt-16 text-2xl font-bold text-ink-soft lg:mt-[113px]">
          Your Likeness Health Score
          <sup className="align-[4px] text-[0.42em]">SM</sup>
        </h1>

        <div className="mt-8 w-full max-w-[300px]">
          <ScoreGauge score={score.live} level={level} band={score.band} />
        </div>

        {/* Capped at the design's own measure so it breaks after "risk of", not
            mid-phrase — the line the accent word lands on is the point of it. */}
        <h2 className="mt-16 max-w-[620px] text-[34px] leading-[42px] font-bold text-ink lg:mt-[75px] lg:text-[56px] lg:leading-[72px]">
          {firstName}, Your risk of likeness abuse is{" "}
          {/* Coloured by band, not fixed — this was reading "Low" in the high-risk
              red. Same three colours the gauge and the app's score legend use. */}
          <em className={RISK_WORD[level]}>{label}</em>
        </h2>

        <p className="mt-6 max-w-[680px] text-lg leading-7 text-ink-soft lg:mt-[37px] lg:text-xl lg:leading-7">
          A Likeness Health Score of {score.live} indicates that you are at{" "}
          {score.band} for likeness theft and misuse online. {cohort}% of the people
          similar to you have experienced likeness theft.
        </p>

        {/* The ceiling, which is new and is not cosmetic: a fresh account cannot
            reach 100 yet, so a score of 62 out of a ceiling of 70 is a very
            different thing from 62 out of 100. Saying so is what stops the number
            reading as a worse result than it is. */}
        {score.current_ceiling < score.maximum_ceiling ? (
          <p className="mt-4 max-w-[680px] text-base leading-6 text-ink-muted">
            You&apos;re at {score.live} of a possible {score.current_ceiling} today —
            your ceiling rises to {score.maximum_ceiling} after{" "}
            {score.breakdown.escrow.next_milestone_days ?? 90} days of monitoring.
          </p>
        ) : null}

        {/* Attached to every score response by the API, and meant to be shown: the
            score is likeness-protection health in MONITORED SOURCES. It is never
            "you're safe", never "across the web", and 100 is never an all-clear. */}
        <p className="mt-4 max-w-[680px] text-sm leading-5 text-ink-faint">
          {record.scopeNote}
        </p>

        <h2 className="mt-16 text-[28px] font-bold text-ink lg:mt-[53px] lg:text-[38px]">
          What affected your score.
        </h2>

        {/* Three cards is what the design has room for; `topFactors` picks the three
            that actually cost this person the most points. */}
        <ul className="mt-10 grid w-full gap-[33px] pb-20 sm:grid-cols-2 lg:mt-[42px] lg:grid-cols-3 lg:pb-[67px]">
          {factors.map((factor) => {
            const Icon = FACTOR_ICONS[factor.icon];
            return (
              <li
                key={factor.key}
                className="flex flex-col items-center rounded-2xl border border-line-card px-8 pt-8 pb-8 lg:min-h-[269px]"
              >
                {/* Centred in the disc at its own drawn size — the design's three
                    are 22.5×25, 13.75×21.25 and 25×25, not one square. */}
                <span className="flex size-20 items-center justify-center rounded-full bg-surface text-ink">
                  <Icon />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-ink">
                  {factor.title}
                </h3>
                <p className="mt-3 text-sm leading-5 text-ink-body">
                  {factor.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <AppHandoffSection handoff={handoff} />
    </main>
  );
}
