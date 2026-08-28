"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/landing/icons";
import {
  CALLING_CODES,
  composePhone,
  DEFAULT_CALLING_CODE,
  DEFAULT_COUNTRY,
} from "@/lib/calling-codes";
import { backPath, nextPath, STEP_PATHS } from "@/lib/funnel";
import { readFunnel, writeFunnel } from "@/lib/funnel-state";
import { quizIncomplete } from "@/lib/quiz";
import { QUIZ } from "@/lib/quiz-content";
import { Calendar, ChatBubble, ContactCard, Envelope } from "./icons";

/**
 * First and last name, email, date of birth and phone — the gate in front of the
 * score.
 *
 * Submitting sends the OTP. Nothing is written to the shared user record here: the
 * server only remembers the details in a signed cookie until the code comes back,
 * so an unverified phone number can't overwrite somebody else's score.
 *
 * The details are deliberately NOT kept in `funnel-state`. sessionStorage survives a
 * reload, and a shared phone would hand the next person a stranger's name and email
 * back on a plate — the server already holds them for the one hop to the OTP screen.
 * Only the phone is stored, and only so the OTP screen can say where it texted.
 *
 * The form guards itself against being reached with no quiz behind it, which the page
 * cannot do: the answers are in this tab's sessionStorage and the server has never
 * seen them. Without the guard, someone who opened /details directly would hand over
 * a phone number, spend a code, and land on a loader that immediately bounced them
 * back to question one — having verified for nothing.
 */

const FIELD =
  "h-14 w-full rounded-[14px] border-[1.6px] bg-canvas pr-4 pl-[55px] text-base text-ink transition-colors placeholder:text-ink-placeholder focus:outline-none";

/**
 * Types a birth date into `YYYY-MM-DD` as it is entered.
 *
 * Only ever inserts the separators — it does not reorder, reject or complete
 * anything, so the field never fights someone mid-keystroke and a backspace always
 * removes what it looks like it removes. Whether the date is real is settled by
 * `validateDob` on the server, which is the copy that matters.
 *
 * Eight digits is the whole date; anything past that is a stray keypress and is
 * dropped rather than silently changing the year.
 */
function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
  return parts.filter((part) => part !== "").join("-");
}

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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  /* No quiz behind this form means there is no score to send anywhere, so there is
     nothing to ask for. Same shape as the guard on the OTP screen, and same reason it
     is an effect rather than a redirect on the page: the answers are in this tab's
     sessionStorage and the server has never seen them.

     Read the store directly rather than through `useFunnel`: the hook's first value
     is the empty server snapshot, which would read as an abandoned quiz and bounce
     someone who answered everything. */
  useEffect(() => {
    if (quizIncomplete(QUIZ, readFunnel())) {
      router.replace(STEP_PATHS["quiz-questions"]);
    }
  }, [router]);

  /* One lookup feeds both sides of the picker: the code goes into the composed
     number, the flag onto the display drawn over the <select>. */
  const selected = CALLING_CODES.find((c) => c.label === country);
  const callingCode = selected?.code ?? DEFAULT_CALLING_CODE;

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
          firstName,
          lastName,
          email,
          dob,
          phone: composePhone(callingCode, phone),
        }),
      });
      const body = (await res.json()) as {
        phone?: string;
        resendAfter?: number | null;
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      /* The server's normalised copy, not ours — it's the string the code was
         actually texted to, and the one the OTP screen should show. `resendAfter`
         is the API's own cooldown, carried through so the OTP screen counts the
         real wait rather than a number this side invented; the API enforces it
         either way, and a shorter local guess just produces a 429. Null when the
         API's timestamp wouldn't parse; it collapses to undefined so the OTP
         screen falls back to its own figure rather than storing a dead value. */
      writeFunnel({
        phone: body.phone,
        resendAfter: body.resendAfter ?? undefined,
        lastStep: "details",
      });
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
        {/* Two fields rather than one "Full Name", because `PATCH /v1/me/profile`
            stores `first_name` and `last_name` as separate columns and /v1 keeps no
            combined string beside them. Splitting one field on the first space got
            anyone with a two-word given name wrong and left them nothing to correct
            it from — asking for the two parts the record actually has costs one
            input and removes the guess. Side by side where there is room; a phone
            stacks them like everything else. */}
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex-1">
            <Field icon={<ContactCard />}>
              <label htmlFor={`${ids}-first`} className="sr-only">
                First name
              </label>
              <input
                id={`${ids}-first`}
                name="given-name"
                type="text"
                autoComplete="given-name"
                required
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`${FIELD} border-line-soft focus:border-brand`}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field icon={<ContactCard />}>
              <label htmlFor={`${ids}-last`} className="sr-only">
                Last name
              </label>
              <input
                id={`${ids}-last`}
                name="family-name"
                type="text"
                autoComplete="family-name"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`${FIELD} border-line-soft focus:border-brand`}
              />
            </Field>
          </div>
        </div>

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
         * `type="date"` rather than a text box asking for YYYY-MM-DD: it is the only
         * input that gives back exactly the format `PATCH /v1/me/profile` stores, with
         * no parsing on either side, and on a phone it opens the OS date picker rather
         * than a keyboard. The cost is that it shows its own format hint instead of a
         * placeholder, so the label sits above the field — the one field here that
         * cannot rely on a placeholder to name itself.
         *
         * The native picker button is hidden and the field opens the picker on click,
         * so it keeps the left-hand icon the other three fields have rather than
         * carrying a second calendar glyph on its right. `showPicker` throws in
         * browsers that don't have it, which is fine: those fall back to typing.
         */}
        <Field icon={<Calendar />}>
          <label htmlFor={`${ids}-dob`} className="sr-only">
            Date of birth
          </label>
          <input
            id={`${ids}-dob`}
            name="dob"
            /* Text, not `type="date"`. The native control draws its format hint in
               the browser's LOCALE order — dd/mm/yyyy here, mm/dd/yyyy in the US —
               and that string is the input's own value text, not a placeholder, so
               it takes the field's ink colour and cannot be styled down to
               `ink-placeholder` like the three fields around it. Neither the order
               nor the colour is controllable. A text box gives back both, and lets
               this field name itself with a placeholder the way the others do.
               What it costs is the OS date picker — no great loss for a birth date,
               which opens the picker on the current month and makes the visitor
               page back twenty years. */
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            required
            placeholder="Date of Birth (YYYY-MM-DD)"
            value={dob}
            onChange={(e) => setDob(formatDob(e.target.value))}
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
           * Still a native <select>, because the OS picker is the kindest thing on a
           * phone: it scrolls, it takes type-ahead, and it needs no outside-tap or
           * arrow-key handling of ours. The one thing it cannot do is show a different
           * string open and closed, and the two pull opposite ways — the open list is
           * only readable with country names on it, while the closed control has to
           * fit inside the phone field next to the digits, where a name will not go.
           * Dial codes alone was the wrong half to keep: a bare column of "+353, +27,
           * +33" asks the reader to know the codes already.
           *
           * So the <select> carries the names and is laid transparent over a display
           * of our own, which shows the flag and the code and takes no taps of its
           * own. `peer` passes the real control's focus and hover through to it, so
           * the thing that looks like the control still reacts like one.
           *
           * Keyed by country, not by calling code: the US and Canada both send +1,
           * and two <option>s sharing a value both come up selected — the browser
           * then shows whichever is last, so picking the US displayed Canada.
           */}
          <div className="absolute top-1/2 right-2.5 h-11 -translate-y-1/2">
            <select
              id={`${ids}-code`}
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              /* `text-base`, invisible though it is: iOS zooms the page in on a
                 focused control drawn below 16px. */
              className="peer absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0"
            >
              {CALLING_CODES.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.flag} {option.label} (+{option.code})
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none flex h-full items-center gap-1.5 rounded-[10px] border-[1.6px] border-line-soft bg-surface pr-1.5 pl-2.5 text-sm font-semibold text-ink-soft transition-colors peer-hover:border-line peer-focus-visible:border-brand"
            >
              <span className="text-base leading-none">{selected?.flag}</span>+
              {callingCode}
              <ChevronDown className="size-4 text-ink-faint" />
            </span>
          </div>
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
