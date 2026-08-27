import type { Metadata } from "next";
import { FunnelShell } from "@/components/funnel/FunnelShell";
import { OtpForm } from "@/components/funnel/OtpForm";

export const metadata: Metadata = {
  title: "ImageShield — Enter your verification code",
};

/**
 * Phone verification.
 *
 * The design set doesn't include this screen, so it borrows the details screen's
 * shell verbatim — same header, same 560px column, same heading and button sizes —
 * and takes its behaviour from the app's OTPScreen, which is the version of this
 * step users of the product already know.
 *
 * The 15 minutes in the subtitle is the funnel's own pending window, which is a limit
 * this side genuinely enforces — the API's challenge carries its own `expires_at`, and
 * quoting a number we don't control would be a promise we can't keep. Whichever runs
 * out first, the screen's dead end is the same and it offers a fresh number.
 *
 * Nothing to guard against here any more. This screen used to submit the quiz answers
 * alongside the code, so it had to check they existed first; the questions now come
 * after this step, and the code buys the session that will read them.
 */
export default function OtpPage() {
  return (
    <FunnelShell
      title="Enter your verification code"
      subtitle="We texted you a 6-digit code. Enter it within 15 minutes."
    >
      <OtpForm />
    </FunnelShell>
  );
}
