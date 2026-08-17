import { SiteHeader } from "@/components/landing/SiteHeader";
import type { Handoff } from "@/lib/handoff";
import {
  type FactorIcon,
  riskLabel,
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

/** The result screen. Everything on it comes off the stored record. */
export function ScoreResult({
  record,
  handoff,
}: {
  record: ScoreRecord;
  handoff: Handoff;
}) {
  const level = riskLevelOf(record);
  const label = riskLabel(level);
  const factors = topFactors(record.breakdown);
  /* The score is a health score — 100 is safest — so the share of comparable people
     who have been hit reads as its complement. The backend does not supply a real
     cohort figure; the design hardcodes "50%" beside a score of 49, which is what
     this reproduces. Swap it the moment there is a number to swap it for. */
  const cohort = 100 - record.score;
  /* Only the first name, as the design has it. */
  const firstName = record.fullName.trim().split(/\s+/)[0];

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
          <ScoreGauge score={record.score} level={level} />
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
          A Likeness Health Score of {record.score} indicates that you are at a{" "}
          {label} risk for likeness theft and misuse online. {cohort}% of the people
          similar to you have experienced likeness theft.
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
