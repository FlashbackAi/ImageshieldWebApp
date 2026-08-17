"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { backPath, nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel } from "@/lib/funnel-state";
import { missingAnswers } from "@/lib/quiz";

/**
 * The six-digit code, ported from the app's OTPScreen.
 *
 * Same behaviour as the phone: one box per digit, focus walks forward as you type
 * and backward on backspace into an empty box, a paste fills the row, and a full
 * code verifies itself rather than waiting for a tap on a button — QC flagged that
 * last one on mobile as needless friction, and it is the same friction here.
 *
 * The verify call is also where the answers are submitted. That is the server's
 * design, not a convenience: verifying and writing happen in one request so there
 * is no window in which a half-verified session can write to the user record.
 */
const LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

const EMPTY = Array<string>(LENGTH).fill("");

export function OtpForm() {
  const router = useRouter();

  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  /* Guards the auto-submit against a double fire. The server counts every wrong
     code against a rate limit, so submitting the same six digits twice costs the
     user one of their attempts for nothing. */
  const submitted = useRef<string | undefined>(undefined);

  const code = digits.join("");

  useEffect(() => {
    const funnel = readFunnel();
    if (missingAnswers(funnel.answers).length) {
      router.replace(STEP_PATHS["quiz-questions"]);
      return;
    }
    // No number means the details step never completed, so no code was ever sent.
    if (!funnel.phone) {
      router.replace(STEP_PATHS.details);
      return;
    }
    boxes.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useCallback(
    async (entered: string) => {
      if (submitted.current === entered) return;
      submitted.current = entered;

      setVerifying(true);
      setError(null);
      try {
        const res = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: entered,
            answers: readFunnel().answers,
          }),
        });
        const body = (await res.json()) as { error?: string };

        if (!res.ok) {
          setError(body.error ?? "That code isn't right");
          setDigits(EMPTY);
          boxes.current[0]?.focus();
          // Let the same digits be tried again after a clear — the user may have
          // simply mistyped, and the server is the one keeping count.
          submitted.current = undefined;
          return;
        }

        router.push(nextPath("otp") ?? STEP_PATHS.landing);
      } catch {
        setError("We couldn't reach the server. Check your connection.");
        submitted.current = undefined;
      } finally {
        setVerifying(false);
      }
    },
    [router],
  );

  /**
   * Types a digit, or spreads a pasted code across the row.
   *
   * The auto-verify fires from here rather than from an effect watching the code:
   * completing the code is an event, not state to synchronise, and running it in an
   * effect re-submits on any re-render that happens to leave six digits in place.
   */
  function change(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    setError(null);

    let next: string[];
    if (cleaned.length > 1) {
      // A paste (or an SMS autofill) — lay it out from the first box, not this one.
      next = [...EMPTY];
      cleaned
        .slice(0, LENGTH)
        .split("")
        .forEach((c, i) => (next[i] = c));
      boxes.current[Math.min(cleaned.length, LENGTH - 1)]?.focus();
    } else {
      next = [...digits];
      next[index] = cleaned;
      if (cleaned && index < LENGTH - 1) boxes.current[index + 1]?.focus();
    }

    setDigits(next);

    const entered = next.join("");
    if (entered.length === LENGTH) verify(entered);
  }

  function keyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      // Clear the box behind and step into it, so one press does one visible thing.
      event.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
      boxes.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      /* `/api/otp/start` needs the full contact again, but this screen deliberately
         never held the name and email. The number is enough to re-send: the pending
         session cookie still carries the rest. */
      const res = await fetch("/api/otp/resend", { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't resend your code.");
        return;
      }
      setDigits(EMPTY);
      submitted.current = undefined;
      boxes.current[0]?.focus();
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mt-7">
      <div className="flex gap-2 sm:gap-4">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={digit}
            onChange={(e) => change(i, e.target.value)}
            onKeyDown={(e) => keyDown(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            // Not `maxLength={1}`: a paste has to be allowed in so it can be spread
            // across the row, which is what the app does too.
            maxLength={LENGTH}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            disabled={verifying}
            className={`h-14 min-w-0 flex-1 rounded-xl border-[1.6px] bg-canvas text-center text-[22px] font-semibold text-ink transition-colors focus:border-brand focus:outline-none disabled:opacity-60 sm:h-[72px] ${
              digit ? "border-brand/70" : "border-line-soft"
            }`}
          />
        ))}
      </div>

      <div aria-live="polite" className="mt-4 min-h-6 text-sm">
        {error ? (
          <p role="alert" className="text-danger">
            {error}
          </p>
        ) : verifying ? (
          <p className="text-ink-muted">Verifying…</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0 || resending}
        className="mt-2 self-start text-sm font-medium text-brand transition-colors disabled:text-ink-faint"
      >
        {resending
          ? "Sending…"
          : cooldown > 0
            ? `Resend code in ${cooldown}s`
            : "Resend code"}
      </button>

      <div className="mt-12 flex flex-col-reverse gap-4 sm:flex-row sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={() => router.push(backPath("otp") ?? STEP_PATHS.details)}
          className="flex h-14 items-center justify-center rounded-full bg-canvas text-base font-semibold text-brand-ink transition-colors hover:bg-surface sm:w-44"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => verify(code)}
          disabled={code.length < LENGTH || verifying}
          className="flex h-14 items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40 sm:w-[317px]"
        >
          {verifying ? "Verifying…" : "Review my score"}
        </button>
      </div>
    </div>
  );
}
