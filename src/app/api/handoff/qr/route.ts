import QRCode from "qrcode";
import { handoffFor } from "@/lib/handoff";
import { SessionUnavailable } from "@/lib/session";
import { fetchMe } from "@/lib/v1/me";

/**
 * GET /api/handoff/qr — the QR on the result screen, as SVG.
 *
 * Rendered here rather than in the browser so the link is built from the same env
 * config as everything else, and so the phone number in it comes from the person's
 * own record rather than a query string anyone could edit. `GET /v1/me` is what
 * supplies it now — the funnel no longer keeps a phone number of its own past the
 * OTP screen, because /v1 gave it nothing to do with one.
 *
 * SVG, not PNG: it stays sharp at whatever size the layout ends up using, and it's
 * a few KB of text instead of an image buffer.
 */
export async function GET() {
  let phone: string;
  try {
    phone = (await fetchMe()).account.phone_e164;
  } catch (error) {
    if (error instanceof SessionUnavailable) {
      return Response.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("handoff qr failed", (error as Error).message);
    return Response.json({ error: "Couldn't build the code" }, { status: 502 });
  }

  const svg = await QRCode.toString(handoffFor(phone).deepLink, {
    type: "svg",
    // Phone cameras read this off a screen at arm's length; a wide quiet zone and
    // the higher correction level survive glare and a smallish render box.
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Contains the user's own number — never let a proxy hold onto it.
      "Cache-Control": "no-store, private",
    },
  });
}
