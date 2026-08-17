"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  CALLING_CODES,
  composePhone,
  DEFAULT_CALLING_CODE,
  DEFAULT_COUNTRY,
} from "@/lib/calling-codes";
import { backPath, nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel, writeFunnel } from "@/lib/funnel-state";
import { missingAnswers } from "@/lib/quiz";
import { ChatBubble, ContactCard, Envelope } from "./icons";

/**
 * Name, email and phone — the gate in front of the score.
 *
 * Submitting sends the OTP. Nothing is written to the shared user record here: the
 * server only remembers the details in a signed cookie until the code comes back,
 * so an unverified phone number can't overwrite somebody else's score.
 *
 * The details are deliberately NOT kept in `funnel-state`. sessionStorage survives a
 * reload, and a shared phone would hand the next person a stranger's name and email
 * back on a plate — the server already holds them for the one hop to the OTP screen.
 * Only the phone is stored, and only so the OTP screen can say where it texted.
 */

const FIELD =
  "h-14 w-full rounded-[14px] border-[1.6px] bg-canvas pr-4 pl-[55px] text-base text-ink transition-colors placeholder:text-ink-placeholder focus:outline-none";

function Field({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      {/* The three field icons all draw 20.25 wide, 19.5px in from the field's
          left edge. The box matches so they sit on one vertical line. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[19.5px] flex w-[20.25px] -translate-y-1/2 justify-center text-ink-faint"
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

export function DetailsForm() {
  const router = useRouter();
  const ids = useId();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const callingCode =
    CALLING_CODES.find((c) => c.label === country)?.code ?? DEFAULT_CALLING_CODE;

  useEffect(() => {
    /* Read the store directly rather than through `useFunnel`, for the same reason
       the loader does: the hook's first value is the empty server snapshot, which
       would read as an abandoned quiz and bounce someone who answered everything. */
    if (missingAnswers(readFunnel().answers).length) {
      router.replace(STEP_PATHS["quiz-questions"]);
    }
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: composePhone(callingCode, phone),
        }),
      });
      const body = (await res.json()) as { phone?: string; error?: string };

      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      // The server's normalised copy, not ours — it's the string the code was
      // actually texted to, and the one the OTP screen should show.
      writeFunnel({ phone: body.phone, lastStep: "details" });
      router.push(nextPath("details") ?? STEP_PATHS.landing);
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-7">
      <div className="flex flex-col gap-5">
        <Field icon={<ContactCard />}>
          <label htmlFor={`${ids}-name`} className="sr-only">
            Full name
          </label>
          <input
            id={`${ids}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`${FIELD} border-line-soft focus:border-brand`}
          />
        </Field>

        <Field icon={<Envelope />}>
          <label htmlFor={`${ids}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${ids}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${FIELD} border-line-soft focus:border-brand`}
          />
        </Field>

        {/*
         * The design draws one plain "Cellphone" box, but the server rejects a
         * number with no country code rather than guessing one, so the picker has
         * to be here. It sits inside the field's right edge so the box still reads
         * as the single control the design shows.
         */}
        <Field icon={<ChatBubble />}>
          <label htmlFor={`${ids}-phone`} className="sr-only">
            Cellphone number
          </label>
          <input
            id={`${ids}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            placeholder="Cellphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${FIELD} border-line-soft pr-[124px] focus:border-brand`}
          />
          <label htmlFor={`${ids}-code`} className="sr-only">
            Country calling code
          </label>
          {/*
           * Keyed by country, not by calling code: the US and Canada both send +1,
           * and two <option>s sharing a value both come up selected — the browser
           * then shows whichever is last, so picking the US displayed Canada.
           */}
          <select
            id={`${ids}-code`}
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="absolute top-1/2 right-3 h-10 -translate-y-1/2 rounded-[10px] bg-surface px-2 text-sm text-ink-soft focus:outline-none"
          >
            {CALLING_CODES.map((option) => (
              <option key={option.label} value={option.label}>
                {option.flag} +{option.code}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/*
       * The design centres a 176 + 20 + 317 row inside the 560 column. On a phone
       * there is no room for that, so they go full width and the primary leads.
       */}
      <div className="mt-12 flex flex-col-reverse gap-4 sm:flex-row sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={() => router.push(backPath("details") ?? STEP_PATHS.quiz)}
          className="flex h-14 items-center justify-center rounded-full bg-canvas text-base font-semibold text-brand-ink transition-colors hover:bg-surface sm:w-44"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={sending}
          className="flex h-14 items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40 sm:w-[317px]"
        >
          {sending ? "Sending code…" : "Review my score"}
        </button>
      </div>
    </form>
  );
}
