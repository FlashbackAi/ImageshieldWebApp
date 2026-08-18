/**
 * Marketing nav, in the order the V1 design lists it.
 *
 * Only `#download`, `/quiz` and `/faq` resolve today — the rest are placeholders
 * pointing at the anchors those sections will claim, so wiring them up later is a
 * matter of rendering the section with the matching `id`.
 */
export const SITE_NAV: ReadonlyArray<{
  label: string;
  href: string;
  /** The first two links are set in plain white; the rest in the dimmer nav ink. */
  bright?: boolean;
  /** Renders a raised ℠ after the label. */
  serviceMark?: boolean;
}> = [
  { label: "Download", href: "#download", bright: true },
  {
    label: "Likeness Health Quiz",
    href: "/quiz",
    bright: true,
    serviceMark: true,
  },
  { label: "FAQ", href: "/faq" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Privacy", href: "#privacy" },
  { label: "Patents", href: "#patents" },
];

/**
 * The same nav as V3 draws it over the landing hero.
 *
 * Kept apart from `SITE_NAV` rather than derived from it: V3 drops the quiz link —
 * the hero's own CTA is the way in — and sets every remaining label in one ink, so
 * there is no emphasis flag and no service mark to carry. The funnel screens are
 * still on the V1 bar and still need all seven, so the two lists genuinely differ.
 */
export const HERO_NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Download", href: "#download" },
  { label: "FAQ", href: "/faq" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Privacy", href: "#privacy" },
  { label: "Patents", href: "#patents" },
];

/** Social accounts, in the order the footer row shows them. */
export const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/ImageShield/100064076020962/",
  },
  { label: "X", href: "https://x.com/image_shield" },
  { label: "Instagram", href: "https://www.instagram.com/image_shield/" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/imageshield-protection/",
  },
  { label: "YouTube", href: "https://www.youtube.com/@UseImageShield" },
] as const;

/** The live store listings the design's download badges point at. */
export const STORE_LINKS = {
  appStore:
    "https://apps.apple.com/us/app/imageshield-ai-image-security/id6746722108",
  googlePlay:
    "https://play.google.com/store/apps/details?id=com.imageshieldmobile",
} as const;

/**
 * The old site's footer links. These four pages have not been rebuilt here yet, so
 * they point back at imageshield.com rather than at routes that would 404 — swap
 * each href for a local path as its page lands.
 */
export const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "https://imageshield.com/privacy-policy" },
  {
    label: "Terms of Service",
    href: "https://imageshield.com/terms-and-conditions",
  },
  { label: "Patent Notice", href: "https://imageshield.com/patent-notice" },
  {
    label: "Biometric Consent Agreement",
    href: "https://imageshield.com/biometric-consent-agreement",
  },
  { label: "Contact Us", href: "mailto:support@imageshield.com" },
] as const;

/** Where existing subscribers on the pre-app product still sign in. */
export const LEGACY_PLATFORM_URL = "https://app.imageshield.com/guest/login";

/**
 * TrustArc's certification seal, under the registration id the old site uses. The
 * image is served from TrustArc and has to stay on their host — the seal is only
 * valid while it resolves against their validation page.
 */
export const TRUSTE_SEAL = {
  validation:
    "https://privacy.truste.com/privacy-seal/validation?rid=87419b93-285d-4d77-946b-bcd0ae23b547",
  image:
    "https://privacy-policy.truste.com/privacy-seal/seal?rid=87419b93-285d-4d77-946b-bcd0ae23b547",
} as const;
