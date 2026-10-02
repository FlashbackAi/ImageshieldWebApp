/**
 * What a visitor posts when they share their Likeness Health Score.
 *
 * Ported from the app's `utils/scoreShare.js` so a score shared from the web reads
 * the same as one shared from a phone. One deliberate difference: the risk word is
 * the band the API served (`bandLabel`), not a band worked out from the number. The
 * app derives its own; this site never does — see the note on `BAND_LEVELS` — and a
 * caption calling a score "moderate" under a page that says "High" is the one
 * disagreement a screenshot would make permanent.
 *
 * Client-safe: the share button builds the caption, the poster route prints the link,
 * and both take it from `SHARE_URL` so the picture and its caption name one address.
 */
import { bandLabel, riskLevelOf } from "./score";

/**
 * Where the shared link sends people: the deployed funnel, which is the one page
 * that can give a recipient a score of their own. The app's `QUIZ_URL` is this same
 * address, so a score shared from either one links to the same place.
 *
 * Configured rather than read off the address bar. The page a visitor shares from
 * isn't necessarily one a recipient can open — in development it is localhost, and a
 * preview deployment is a throwaway URL — and the link outlives the visit. Set
 * `NEXT_PUBLIC_SHARE_URL` when the funnel moves to its branded domain.
 */
export const SHARE_URL =
  process.env.NEXT_PUBLIC_SHARE_URL?.trim() || "https://imageshield-web-app.vercel.app";

/** The name the picture is saved and shared under. */
export const POSTER_FILENAME = "likeness-health-score.png";

/**
 * The poster is the story canvas every social surface composes to, 9:16 at the
 * resolution they post at. The app writes the same 1080×1920.
 */
export const POSTER_SIZE = { width: 1080, height: 1920 } as const;

/**
 * A link as it is printed: no scheme, no trailing slash. `https://` costs a third
 * of the line on the poster and tells a reader nothing.
 */
export function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * The caption that rides along with the picture.
 *
 * "Healthy" is reserved for a low-risk band: calling a moderate or high score
 * healthy would be exactly the false reassurance the app's wording avoids.
 */
export function shareCaption(score: { live: number; band: string }): string {
  const healthy = riskLevelOf(score) === "low" ? "healthy " : "";
  const risk = bandLabel(score).toLowerCase();

  return (
    `I have a ${healthy}Likeness Health Score℠ of ${score.live} out of 100.  ` +
    `This means that my risk of likeness abuse is ${risk}.\n\n` +
    `What's your score?  Take the 1-minute Likeness Health Quiz on ImageShield at ${SHARE_URL}.`
  );
}
