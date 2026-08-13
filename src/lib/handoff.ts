/**
 * The bridge from this browser to the app.
 *
 * There is no token to redeem: the score is already sitting on the user record
 * keyed by phone number, so the handoff is simply "install the app and sign in
 * with the number you just verified". The phone rides along in the link only to
 * prefill that login field.
 */
export type Handoff = {
  /** Opens the app when it's installed, the listing when it isn't. */
  deepLink: string;
  appStoreUrl: string;
  playStoreUrl: string;
};

export function handoffFor(phone: string): Handoff {
  const base =
    process.env.NEXT_PUBLIC_APP_DEEP_LINK ?? "https://imageshield.ai/open";
  const deepLink = new URL(base);
  deepLink.searchParams.set("phone", phone);

  return {
    deepLink: deepLink.toString(),
    appStoreUrl:
      process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/",
    playStoreUrl:
      process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
      "https://play.google.com/store/apps/details?id=com.imageshield",
  };
}
