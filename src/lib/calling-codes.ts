/**
 * Country calling codes for the details form's phone field.
 *
 * `validateContact` will not invent a country code — a bare "5551230000" is thrown
 * out rather than guessed at, because guessing forks a second user record the app
 * will never find. So the form has to supply one, exactly as the app's LoginScreen
 * does with its country picker.
 *
 * This is a shortlist, not ISO 3166. It covers the markets the funnel runs in; for
 * anywhere else the field also accepts a full "+.." number typed or pasted straight
 * in, which bypasses the picker entirely (see `composePhone`). That keeps the
 * dropdown short enough to be usable on a phone without locking anyone out.
 */
export type CallingCode = { code: string; label: string; flag: string };

export const CALLING_CODES: readonly CallingCode[] = [
  { code: "1", label: "United States", flag: "🇺🇸" },
  { code: "1", label: "Canada", flag: "🇨🇦" },
  { code: "44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "61", label: "Australia", flag: "🇦🇺" },
  { code: "64", label: "New Zealand", flag: "🇳🇿" },
  { code: "353", label: "Ireland", flag: "🇮🇪" },
  { code: "91", label: "India", flag: "🇮🇳" },
  { code: "27", label: "South Africa", flag: "🇿🇦" },
  { code: "33", label: "France", flag: "🇫🇷" },
  { code: "49", label: "Germany", flag: "🇩🇪" },
  { code: "34", label: "Spain", flag: "🇪🇸" },
  { code: "39", label: "Italy", flag: "🇮🇹" },
  { code: "31", label: "Netherlands", flag: "🇳🇱" },
  { code: "46", label: "Sweden", flag: "🇸🇪" },
  { code: "47", label: "Norway", flag: "🇳🇴" },
  { code: "45", label: "Denmark", flag: "🇩🇰" },
  { code: "351", label: "Portugal", flag: "🇵🇹" },
  { code: "48", label: "Poland", flag: "🇵🇱" },
  { code: "52", label: "Mexico", flag: "🇲🇽" },
  { code: "55", label: "Brazil", flag: "🇧🇷" },
  { code: "54", label: "Argentina", flag: "🇦🇷" },
  { code: "81", label: "Japan", flag: "🇯🇵" },
  { code: "82", label: "South Korea", flag: "🇰🇷" },
  { code: "65", label: "Singapore", flag: "🇸🇬" },
  { code: "63", label: "Philippines", flag: "🇵🇭" },
  { code: "60", label: "Malaysia", flag: "🇲🇾" },
  { code: "971", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "972", label: "Israel", flag: "🇮🇱" },
  { code: "234", label: "Nigeria", flag: "🇳🇬" },
  { code: "254", label: "Kenya", flag: "🇰🇪" },
];

/**
 * What the picker starts on, matching the app's `useState('US')` / `useState('1')`.
 *
 * The picker is keyed by country rather than by code because codes are not unique —
 * the US and Canada both send +1 — and two <option>s with the same value both come
 * up selected.
 */
export const DEFAULT_COUNTRY = "United States";
export const DEFAULT_CALLING_CODE = "1";

/**
 * Joins the picker and the typed digits into the E.164 string the server expects.
 *
 * A value the user typed with its own `+` wins — someone pasting a full
 * international number from their contacts shouldn't have it prefixed a second
 * time — and so does a `00` prefix, which is how most of the world writes one
 * by hand. `normalizePhone` on the server settles both into a leading `+`.
 *
 * Anything else is treated as a local number and prefixed as-is. Deliberately no
 * "strip the calling code if the digits happen to start with it": plenty of real
 * local numbers open with their own country's digits — +91 9198…, +1 1… is barred
 * but +44 44… is not — and stripping those silently texts a different person.
 */
export function composePhone(callingCode: string, typed: string): string {
  const trimmed = typed.trim();
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  return digits ? `+${callingCode}${digits}` : "";
}
