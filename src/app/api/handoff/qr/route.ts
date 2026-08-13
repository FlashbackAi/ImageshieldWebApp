import QRCode from "qrcode";
import { handoffFor } from "@/lib/handoff";
import { readVerifiedSession } from "@/lib/session";

/**
 * GET /api/handoff/qr — the QR on the result screen, as SVG.
 *
 * Rendered here rather than in the browser so the link is built from the same env
 * config as everything else, and so the phone number in it comes from the verified
 * cookie instead of a query string anyone could edit.
 *
 * SVG, not PNG: it stays sharp at whatever size the layout ends up using, and it's
 * a few KB of text instead of an image buffer.
 */
export async function GET() {
  const session = await readVerifiedSession();
  if (!session) {
    return Response.json({ error: "Not verified" }, { status: 401 });
  }

  const svg = await QRCode.toString(handoffFor(session.phone).deepLink, {
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
