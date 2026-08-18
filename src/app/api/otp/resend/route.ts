import { backendFetch, BackendError } from "@/lib/api";
import { allowOtpSend } from "@/lib/rate-limit";
import { readSession } from "@/lib/session";

/**
 * POST /api/otp/resend — no body.
 *
 * Separate from `/api/otp/start` because the OTP screen has no contact details to
 * re-send: the funnel deliberately drops the name and email once the code is away,
 * and the number comes out of the pending session cookie rather than the request, so
 * this can't be turned into "text a code to any number I name".
 *
 * The send policy is `allowOtpSend`, shared with `/api/otp/start` and counted against
 * the same windows — otherwise resending would be a second, uncapped budget of
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

  const allowed = allowOtpSend(request, session.phone);
  if (!allowed.ok) {
    return Response.json({ error: allowed.error }, { status: allowed.status });
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
