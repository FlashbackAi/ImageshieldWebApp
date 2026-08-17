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
 */
export default function OtpPage() {
  return (
    <FunnelShell
      title="Enter your verification code"
      subtitle="We sent a 6-digit code to your phone. It expires in 5 minutes."
    >
      <OtpForm />
    </FunnelShell>
  );
}
