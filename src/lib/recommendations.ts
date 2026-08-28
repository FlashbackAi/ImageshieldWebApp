/**
 * "Immediate Recommendations" — the same two for every visitor, for now.
 *
 * The backend is building the real thing: recommendations picked from what the
 * person actually answered and what monitoring has found. Until that lands there is
 * nothing on the score response to derive them from — `GET /v1/me/score` returns the
 * number, the band and the per-question breakdown, and that is all — so these are the
 * two the design draws, shown to everyone.
 *
 * Worth being honest about what that costs while it lasts: a visitor whose accounts
 * are already private is told to make them private. The copy is therefore written as
 * general advice rather than as a claim about this person, which is the difference
 * between "keep your social media private" and "your accounts are public".
 *
 * When the API serves them, this file becomes the fallback for an empty response
 * rather than the source — `ScoreResult` already takes the list as a prop, so the
 * swap is in the page, not in the screen.
 */
import { Lock, PlayBadge } from "@/components/funnel/icons";

export type Recommendation = {
  /** Stable id, so a served list can be keyed the same way this one is. */
  id: string;
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
};

export const RECOMMENDATIONS: readonly Recommendation[] = [
  {
    id: "youtube-likeness-detection",
    icon: PlayBadge,
    title: "Sign up for YouTube's free likeness detection service",
    body: "It's available to all adults and will monitor videos on YouTube for the use of your likeness.",
  },
  {
    id: "private-accounts",
    icon: Lock,
    title: "Keep your social media private",
    body: "Social media platforms sometimes change their settings, which might effect the privacy of your accounts.",
  },
];
