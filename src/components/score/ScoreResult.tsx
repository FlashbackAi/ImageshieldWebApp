import { SiteHeader } from "@/components/landing/SiteHeader";
import type { Handoff } from "@/lib/handoff";
import type { Recommendation } from "@/lib/recommendations";
import {
  bandLabel,
  type FactorIcon,
  riskLevelOf,
  type RiskLevel,
  type ScoreRecord,
  topFactors,
} from "@/lib/score";
import { Calendar, Eye, Globe, Report, ShieldCheck, Venus, Wand } from "../funnel/icons";
import { AppHandoffSection } from "./AppHandoffSection";
import { DownloadPrompt } from "./DownloadPrompt";
import { InsightCard, type InsightRow } from "./InsightCard";
import { ScoreGauge } from "./ScoreGauge";
import { ScoreScale } from "./ScoreScale";

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
 * The result screen, laid out from the LHS Results V1 export.
 *
 * Everything above the fold comes off the stored record; the two cards under it are
 * the record plus copy. The order is the export's, and it is an argument: the number
 * and what it means, then the one action that follows from it, then why the number is
 * what it is, then what to do about it, then the app.
 *
 * `prompts` maps a breakdown key to the question it was asked as, from the same quiz
 * definition the visitor answered. It is only a fallback: a factor the presentation
 * table recognises gets the written copy, and one it doesn't gets the real question
 * instead of a raw key like `content_type`.
 *
 * `recommendations` is passed in rather than imported so that the day the API serves
 * them, the page changes and this screen does not. See `lib/recommendations.ts`.
 */
export function ScoreResult({
  record,
  handoff,
  prompts,
  recommendations,
}: {
  record: ScoreRecord;
  handoff: Handoff;
  prompts?: ReadonlyMap<string, string>;
  recommendations: readonly Recommendation[];
}) {
  const { score } = record;
  const level = riskLevelOf(score);
  /* The band the API served, rendered as it came. Not derived from the number: the
     API owns the thresholds and says so, and this screen's drawn scale deliberately
     doesn't match them (see ../../lib/score.ts). */
  const label = bandLabel(score);

  const factorRows: InsightRow[] = topFactors(score.breakdown.quiz, prompts).map(
    (factor) => ({
      id: factor.key,
      icon: FACTOR_ICONS[factor.icon],
      title: factor.title,
      body: factor.description,
    }),
  );

  /* The score is a health score — 100 is safest — so the share of comparable people
     who have been hit reads as its complement. The API supplies no real cohort
     figure; the export hardcodes "50%" beside a score of 49, which is what this
     reproduces. Swap it the moment there is a number to swap it for. */
  const cohort = 100 - score.live;

  return (
    /* Inter, like the rest of the marketing site — the funnel's Plus Jakarta Sans
       stops at the OTP screen. */
    <main className="relative min-h-[100dvh] bg-canvas font-site">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[958px] px-6 pt-[65px]">
        <p className="mt-12 text-2xl font-bold text-ink lg:mt-[85px]">
          Your Likeness Health Report
          <sup className="align-[6px] text-[0.42em]">SM</sup>
        </p>

        {/* The gauge sits beside the headline rather than over it, and holds its
            drawn width instead of flexing — an arc that reflows with the column
            drags its printed scale out of step with it. Below `lg` the two stack
            and the gauge centres. */}
        <section className="mt-10 flex flex-col items-center gap-12 lg:mt-[37px] lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="w-full lg:pt-2">
            {/* Capped at the export's own measure so it breaks after "risk of",
                not mid-phrase — the line the accent word lands on is the point. */}
            <h1 className="max-w-[440px] text-[32px] leading-[46px] font-bold text-ink lg:text-[40px] lg:leading-[60px]">
              {record.firstName}, your risk of likeness abuse is{" "}
              <span className={RISK_WORD[level]}>{label}</span>
            </h1>

            <p className="mt-5 max-w-[520px] text-base leading-[23px] text-ink-soft">
              A Likeness Health Score of{" "}
              <strong className="font-bold">{score.live}</strong> indicates that you
              are at a {label} risk for likeness theft and misuse online.{" "}
              <strong className="font-bold">{cohort}%</strong> of the people similar
              to you have experienced likeness theft.
            </p>

            {/* The ceiling, which is not cosmetic: a fresh account cannot reach 100
                yet, so a score of 62 out of a ceiling of 70 is a very different
                thing from 62 out of 100. Saying so is what stops the number reading
                as a worse result than it is. */}
            {score.current_ceiling < score.maximum_ceiling ? (
              <p className="mt-4 max-w-[520px] text-sm leading-5 text-ink-muted">
                You&apos;re at {score.live} of a possible {score.current_ceiling}{" "}
                today — your ceiling rises to {score.maximum_ceiling} after{" "}
                {score.breakdown.escrow.next_milestone_days ?? 90} days of monitoring.
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-[333px] shrink-0">
            <div className="mx-auto w-[191px]">
              <ScoreGauge score={score.live} level={level} band={score.band} />
            </div>
            <div className="mt-9">
              <ScoreScale />
            </div>
          </div>
        </section>

        {/* The one action the score implies, given its own card directly under it.
            Warm rather than lavender, which is the export's way of separating "here
            is what to do" from the two explanatory cards below. */}
        <DownloadPrompt
          handoff={handoff}
          className="mt-14 gap-y-8 rounded-3xl bg-gradient-to-r from-[#F7F3F0] to-[#EFE8E4] px-6 py-10 sm:gap-10 sm:px-8 lg:mt-[62px] lg:gap-10"
        >
          <p className="max-w-[510px] text-2xl leading-9 font-medium text-ink">
            Based on your score, we highly recommend signing up for likeness
            protection by downloading the ImageShield app
          </p>
        </DownloadPrompt>

        <div className="mt-9 flex flex-col gap-10">
          <InsightCard heading="Your risk factors" rows={factorRows} />
          <InsightCard
            heading="Immediate Recommendations"
            rows={recommendations}
            emphasis="body"
          />
        </div>

        <DownloadPrompt
          handoff={handoff}
          compact
          className="mt-14 sm:gap-10 lg:mt-[59px] lg:gap-[65px]"
        >
          <p className="max-w-[610px] text-2xl leading-9 font-medium text-ink">
            To see your full set of recommendations and your complete Likeness Health
            Report
            <sup className="align-[7px] text-[0.4em]">SM</sup>, including tips on how
            you can improve your online safety right away, download the ImageShield
            app
          </p>
        </DownloadPrompt>

        {/* Attached to every score response by the API, and meant to be shown: the
            score is likeness-protection health in MONITORED SOURCES. It is never
            "you're safe", never "across the web", and 100 is never an all-clear. */}
        <p className="mt-12 text-sm leading-5 text-ink-faint">{record.scopeNote}</p>
      </div>

      <AppHandoffSection />
    </main>
  );
}
