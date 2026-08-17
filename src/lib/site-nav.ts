/**
 * Marketing nav, in the order the V1 design lists it.
 *
 * Only `#download` and `/quiz` resolve today — the rest are placeholders pointing
 * at the anchors those sections will claim, so wiring them up later is a matter of
 * rendering the section with the matching `id`.
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
  { label: "FAQ", href: "#faq" },
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
  { label: "FAQ", href: "#faq" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Privacy", href: "#privacy" },
  { label: "Patents", href: "#patents" },
];

/** Social accounts, in the order the footer row shows them. */
export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://facebook.com" },
  { label: "X", href: "https://x.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "YouTube", href: "https://youtube.com" },
] as const;

/** Store listings behind the download badges. */
export const STORE_LINKS = {
  appStore: "https://apps.apple.com/app/imageshield",
  googlePlay: "https://play.google.com/store/apps/details?id=com.imageshield",
} as const;
