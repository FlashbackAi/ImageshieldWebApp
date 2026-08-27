import type { Metadata } from "next";
import { DetailsForm } from "@/components/funnel/DetailsForm";
import { FunnelShell } from "@/components/funnel/FunnelShell";

export const metadata: Metadata = {
  title: "ImageShield — Where should we send your score?",
  description:
    "Tell us where to send your Likeness Health Score. We won't share your information with anyone.",
};

/**
 * Full name, email and phone. Submitting it sends the verification code.
 *
 * Now the step before the questions rather than after them, so there is nothing to
 * guard here: a visitor arriving with no answers is exactly what is expected. It used
 * to load the quiz definition purely to check they had finished, which is no longer a
 * thing that can have happened by this point.
 */
export default function DetailsPage() {
  return (
    <FunnelShell
      title={
        <>
          Your Likeness Health Score
          {/* Service mark, set so it hangs off the cap line like the design draws it. */}
          <sup className="align-[6px] text-[0.42em]">SM</sup> is almost ready! How
          can we send it to you?
        </>
      }
      subtitle="We won't share your information with anyone."
    >
      <DetailsForm />
    </FunnelShell>
  );
}
