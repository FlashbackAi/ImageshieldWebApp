"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { backPath, nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel, useFunnel } from "@/lib/funnel-state";
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
 *
 * Three states, because the code is only the first of them:
 *
 *   code         typing, resending, verifying — the screen as drawn.
 *   save-failed  the code was ACCEPTED and the write after it wasn't. `/verify-otp`
 *                clears the code it accepts, so there is nothing to retype here; the
 *                retry goes to `/api/quiz` against the now-verified session. This
 *                screen used to offer the digits again and answer "that code isn't
 *                right" — true, and the most misleading thing it could have said.
 *   expired      the pending session is gone (15 minutes), so neither verifying nor
 *                resending can work — both answer 401. The only way on is a new
 *                number, so that is the only thing offered.
 */
const LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

const EMPTY = Array<string>(LENGTH).fill("");

type Stage = "code" | "save-failed" | "expired";

export function OtpForm() {
  const router = useRouter();
  const { phone } = useFunnel();

  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [stage, setStage] = useState<Stage>("code");
  const [error, setError] = useState<string | null>(null);
  /** Covers the verify and the save-retry alike — they're the same wait to a user. */
  const [busy, setBusy] = useState(false);
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

  /** Saves the answers against a session that has already proved its number. */
  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: readFunnel().answers }),
      });
      const body = (await res.json()) as { error?: string };

      if (!res.ok) {
        if (res.status === 401) {
          setStage("expired");
          setError(body.error ?? "Your session expired. Start again.");
          return;
        }
        setError(body.error ?? "We couldn't save your answers.");
        return;
      }

      router.push(nextPath("otp") ?? STEP_PATHS.landing);
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }, [router]);

  const verify = useCallback(
    async (entered: string) => {
      if (submitted.current === entered) return;
      submitted.current = entered;

      setBusy(true);
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
        const body = (await res.json()) as {
          error?: string;
          verified?: boolean;
        };

        if (!res.ok) {
          /* The session went before the code came back. Retyping and resending both
             answer 401 from here, so the screen stops offering either. */
          if (res.status === 401) {
            setStage("expired");
            setError(body.error ?? "Your code expired. Start again.");
            return;
          }

          /* The code was right; the write after it failed. The code is spent either
             way, so the retry is the write on its own. */
          if (body.verified) {
            setStage("save-failed");
            setError(body.error ?? "We couldn't save your answers.");
            return;
          }

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
        setBusy(false);
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
        if (res.status === 401) {
          setStage("expired");
          setError(body.error ?? "Your session expired. Start again.");
          return;
        }
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

  /* Shared by both dead ends. A code that never arrives is usually a mistyped
     number, and the backend answers 200 to a send whether or not the SMS actually
     went out (server.js swallows the Twilio error), so the funnel cannot tell the
     user it failed — the way it stays honest is by always leaving this door open. */
  const changeNumber = (
    <Link
      href={STEP_PATHS.details}
      className="text-sm font-medium text-brand transition-colors hover:opacity-70"
    >
      Use a different number
    </Link>
  );

  if (stage === "expired") {
    return (
      <div className="mt-7">
        <p role="alert" className="text-sm text-danger">
          {error ?? "Your code expired."}
        </p>
        <p className="mt-3 text-[14px] leading-[21px] text-black/45">
          Codes are only good for 15 minutes. Enter your number again and we&apos;ll
          text you a new one.
        </p>
        <Link
          href={STEP_PATHS.details}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta sm:w-[317px]"
        >
          Enter your number again
        </Link>
      </div>
    );
  }

  if (stage === "save-failed") {
    return (
      <div className="mt-7">
        {/* Says what is and isn't done, because the difference is the whole reason
            this state exists: the number is verified, the answers are not saved,
            and nothing the user does with a code can change either. */}
        <p className="text-base text-ink">
          Your number is verified — we just couldn&apos;t save your answers.
        </p>
        <p className="mt-3 text-[14px] leading-[21px] text-black/45">
          Nothing has been lost. Try again and we&apos;ll finish scoring your quiz.
        </p>

        <div aria-live="polite" className="mt-4 min-h-6 text-sm">
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : busy ? (
            <p className="text-ink-muted">Saving…</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40 sm:w-[317px]"
        >
          {busy ? "Saving…" : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-7">
      {/* The number the code went to. `/api/otp/start` hands back its own normalised
          copy for exactly this, and until now the screen never showed it — a digit
          typed wrong was invisible, and the silence that follows looks identical to
          a carrier delay. */}
      {phone ? (
        <p className="text-[14px] leading-[21px] text-black/45">
          Sent to <span className="font-semibold text-ink">{phone}</span>.{" "}
          {changeNumber}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2 sm:gap-4">
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
            disabled={busy}
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
        ) : busy ? (
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
          disabled={code.length < LENGTH || busy}
          className="flex h-14 items-center justify-center rounded-full bg-brand text-base font-semibold text-ink-inverse transition-colors hover:bg-cta disabled:opacity-40 sm:w-[317px]"
        >
          {busy ? "Verifying…" : "Review my score"}
        </button>
      </div>
    </div>
  );
}
