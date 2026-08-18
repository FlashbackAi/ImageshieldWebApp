/**
 * Structured data for /faq, carried over from imageshield.com unchanged.
 *
 * The five questions here are a subset of the page, and their answers are the old
 * site's own short summaries rather than the full copy the accordion renders —
 * that mismatch is deliberate on its part and is reproduced rather than corrected,
 * so the rich result Google already shows for this page does not change shape.
 */
export const SITE_URL = "https://imageshield.com";

export const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ImageShield?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ImageShield monitors the internet 24/7 for the unauthorized use of your likeness and the likenesses of your family members, helping you detect and stop deepfakes, scams, impersonations and photo-based identity theft.",
      },
    },
    {
      "@type": "Question",
      name: "How much does ImageShield cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ImageShield is free to download, with subscription plans starting at $4.99 per month. See the pricing page for current plans and household options.",
      },
    },
    {
      "@type": "Question",
      name: "Is ImageShield an app or a website?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ImageShield is a mobile app available on iOS and Android, with a legacy web platform for existing subscribers.",
      },
    },
    {
      "@type": "Question",
      name: "On which social media platforms and websites will ImageShield monitor the use of my likeness?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ImageShield monitors social media platforms and websites worldwide, including the 20 sites on which more than 70% of the world's photos are shared, and pays special attention to sites noted for the generation or distribution of abusive imagery.",
      },
    },
    {
      "@type": "Question",
      name: "Which photos can I NOT upload to ImageShield?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You may not use ImageShield to search for or monitor the likenesses of people other than yourself and family members. ImageShield's patented Verified Facial Search technology makes it impossible to use ImageShield as a stalker tool.",
      },
    },
  ],
};

export const FAQ_BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "FAQ", item: `${SITE_URL}/faq` },
  ],
};
