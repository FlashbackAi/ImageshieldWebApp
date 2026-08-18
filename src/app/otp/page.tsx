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
 * The subtitle used to promise the code expired in 5 minutes. It doesn't: the backend
 * stores it on the user record with no TTL and only clears it once it's been accepted
 * (server.js `saveMobileOTP`). What actually runs out is the funnel's own pending
 * session, at 15 minutes — so that is the number quoted, and it's a limit this side
 * genuinely enforces. The number itself is shown by `OtpForm`, which is the side that
 * holds it.
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
