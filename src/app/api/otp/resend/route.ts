import { backendFetch, BackendError } from "@/lib/api";
import { allow, clientIp } from "@/lib/rate-limit";
import { readSession } from "@/lib/session";

/**
 * POST /api/otp/resend — no body.
 *
 * Separate from `/api/otp/start` because the OTP screen has no contact details to
 * re-send: the funnel deliberately drops the name and email once the code is away,
 * and the number comes out of the pending session cookie rather than the request, so
 * this can't be turned into "text a code to any number I name".
 *
 * The same per-phone and per-IP limits apply, and against the same counters as
 * `/api/otp/start` — otherwise resending would be a second, uncapped budget of
 * messages to the same handset.
 */
export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return Response.json(
      { error: "Your session expired. Start again." },
      { status: 401 },
    );
  }

  if (!allow(`otp:phone:${session.phone}`, 3, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many codes requested. Try again in a few minutes." },
      { status: 429 },
    );
  }
  if (!allow(`otp:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return Response.json(
      { error: "Too many attempts from this network. Try again later." },
      { status: 429 },
    );
  }

  try {
    await backendFetch("/initiate-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: session.phone }),
    });
  } catch (error) {
    console.error("otp/resend failed", {
      status: error instanceof BackendError ? error.status : undefined,
      message: (error as Error).message,
    });
    return Response.json(
      { error: "Couldn't send your code. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
