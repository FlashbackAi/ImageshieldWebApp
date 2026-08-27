import { allowOtpSend } from "@/lib/rate-limit";
import { readChallenge, startChallenge } from "@/lib/session";
import { requestOtp, resendCooldownSeconds } from "@/lib/v1/auth";
import { ApiFailure, presentableFailure } from "@/lib/v1/errors";

/**
 * POST /api/otp/resend — no body.
 *
 * Separate from `/api/otp/start` because the OTP screen has no contact details to
 * re-send: the funnel deliberately drops the name and email from the client once the
 * code is away, and the number comes out of the pending cookie rather than the
 * request, so this can't be turned into "text a code to any number I name".
 *
 * It re-issues rather than re-sends, and the cookie has to be rewritten because of
 * it: `POST /v1/auth/otp` CONSUMES any live challenge for that phone. Keeping the
 * old challenge id would mean verifying the newly texted code against a challenge
 * the API has already discarded — which reads to the visitor as "that code isn't
 * right" for a code that is.
 *
 * The send policy is `allowOtpSend`, shared with `/api/otp/start` and counted against
 * the same windows — otherwise resending would be a second, uncapped budget of
 * messages to the same handset.
 */
export async function POST(request: Request) {
  const challenge = await readChallenge();
  if (!challenge) {
    return Response.json(
      { error: "Your session expired. Start again." },
      { status: 401 },
    );
  }

  const allowed = allowOtpSend(request, challenge.phone);
  if (!allowed.ok) {
    return Response.json({ error: allowed.error }, { status: allowed.status });
  }

  let reissued;
  try {
    reissued = await requestOtp(challenge.phone);
  } catch (error) {
    if (error instanceof ApiFailure && error.status === 429) {
      return Response.json(
        {
          error: presentableFailure(
            error,
            "Too many codes requested. Try again in a few minutes.",
          ),
          retryAfter: error.retryAfter,
        },
        { status: 429 },
      );
    }
    console.error("otp/resend failed", {
      status: error instanceof ApiFailure ? error.status : undefined,
      code: error instanceof ApiFailure ? error.code : undefined,
      message: (error as Error).message,
    });
    return Response.json(
      { error: "Couldn't send your code. Please try again." },
      { status: 502 },
    );
  }

  await startChallenge(challenge, reissued.challenge_id);

  return Response.json({ ok: true, resendAfter: resendCooldownSeconds(reissued) });
}
