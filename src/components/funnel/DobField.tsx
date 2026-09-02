"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft } from "@/components/landing/icons";
import { dobBounds } from "@/lib/contact";
import { Calendar } from "./icons";

/**
 * Date of birth: a text field that still takes typing, with a calendar under it.
 *
 * The field was a plain text box before this, and the reasoning against `type="date"`
 * it carried is still sound — the native control draws its format hint in the
 * browser's LOCALE order, that hint is the input's own value text rather than a
 * placeholder so it cannot be styled down like the fields around it, and the picker
 * opens on the CURRENT month, which for a birth date means paging back twenty-odd
 * years. None of that is controllable.
 *
 * So the calendar is ours. It opens on the year the visitor is likely to want rather
 * than on this one, it jumps by month and year in one click each, and it is styled in
 * the funnel's own tokens. Typing was the one thing the text box got right and it is
 * untouched: the popover follows what is typed rather than fighting it, and a visitor
 * who never opens the calendar sees exactly the field they saw before.
 *
 * Every date here is handled in UTC, matching `ageOn` in contact.ts. A local-time
 * calendar west of Greenwich renders "today" as yesterday for part of the day, which
 * on a bound that decides whether a 13th birthday has arrived is a real off-by-one.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Monday-first, as the rest of the funnel's copy reads. */
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DAY_MS = 86_400_000;

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A COMPLETE, real date or nothing.
 *
 * Half-typed input is not a date — "1994-03" leaves the calendar on whatever month it
 * was showing rather than jumping somewhere arbitrary. The round-trip comparison is
 * what catches a day that doesn't exist: `new Date("2004-02-31")` does not throw, it
 * rolls forward to March 2nd. Same check `validateDob` runs, for the same reason.
 */
function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || iso(parsed) !== value) return null;
  return parsed;
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getTime() + count * DAY_MS);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * The same day-of-month `count` months away, or the last day if that month is short.
 *
 * The clamp is the point: adding a month to the 31st with plain arithmetic rolls into
 * the month after, so paging forward from the 31st would skip February entirely.
 */
function shiftMonth(date: Date, count: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + count + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, month + count, Math.min(date.getUTCDate(), lastDay)),
  );
}

function clamp(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

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
export function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
  return parts.filter((part) => part !== "").join("-");
}

const FIELD =
  "h-14 w-full rounded-[14px] border-[1.6px] bg-canvas pr-4 pl-[55px] text-base text-ink transition-colors placeholder:text-ink-placeholder focus:outline-none";

export function DobField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /* Read once per mount, not per render. The bounds move at UTC midnight, and a
     re-derivation mid-session would renumber an open calendar under someone's cursor
     — a 500ms window once a day, but the kind that is impossible to reproduce. */
  const { earliest, latest } = useMemo(() => dobBounds(), []);

  const selected = parseIso(value);

  /* Where an empty field opens. Twelve years before the youngest date the form
     accepts, so roughly a 25-year-old — a plausible guess that costs one click to
     leave, against the twenty-odd pages a calendar opening on this month costs. */
  const fallback = useMemo(
    () => clamp(shiftMonth(startOfMonth(latest), -12 * 12), earliest, latest),
    [earliest, latest],
  );

  const [cursor, setCursor] = useState(() =>
    startOfMonth(selected ?? fallback),
  );
  const [focusDay, setFocusDay] = useState(() =>
    clamp(selected ?? fallback, earliest, latest),
  );
  /* True only when a KEY moved the selection. The effect below pulls DOM focus into
     the grid, and it must not do that while someone is typing in the field — the
     calendar follows the text box, it does not take the caret off it. */
  const [grabFocus, setGrabFocus] = useState(false);

  const selectedIso = selected === null ? null : iso(selected);

  /* Typing a complete date walks the calendar to it, so the grid and the text box
     never disagree about what is selected.

     Done here rather than in an effect watching `value`. An effect would be a
     setState during render's commit — a cascading render, and the thing React's
     `set-state-in-effect` rule exists to catch. Typing is an event, and this is its
     handler; there is no external system to synchronise with. */
  function type(raw: string) {
    const next = formatDob(raw);
    onChange(next);
    const typed = parseIso(next);
    if (typed === null) return;
    setCursor(startOfMonth(typed));
    setFocusDay(typed);
  }

  useEffect(() => {
    if (!open || !grabFocus) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>('[data-focused="true"]')
      ?.focus();
  }, [open, grabFocus, focusDay]);

  /* Pointer-down rather than click, so a press that starts outside closes the
     calendar before the thing underneath it reacts. */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(date: Date) {
    onChange(iso(date));
    setOpen(false);
    setGrabFocus(false);
    inputRef.current?.focus();
  }

  function moveFocus(to: Date) {
    const next = clamp(to, earliest, latest);
    setFocusDay(next);
    setCursor(startOfMonth(next));
    setGrabFocus(true);
    setOpen(true);
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const byDay: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in byDay) {
      event.preventDefault();
      moveFocus(addDays(focusDay, byDay[event.key]));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveFocus(shiftMonth(focusDay, event.key === "PageUp" ? -1 : 1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      /* To the Monday or the Sunday of the focused week — `getUTCDay` is
         Sunday-based, so it is rotated to match the Monday-first grid. */
      const weekday = (focusDay.getUTCDay() + 6) % 7;
      moveFocus(
        addDays(focusDay, event.key === "Home" ? -weekday : 6 - weekday),
      );
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setGrabFocus(false);
      inputRef.current?.focus();
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    /* Down from the text box steps into the grid — the standard way into a combobox
       popup, and the only route in for someone who never touches a pointer. */
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(focusDay);
    }
  }

  const monthStart = cursor;
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  /* `getUTCDay` counts from Sunday; the grid starts on Monday. */
  const leading = (monthStart.getUTCDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from(
      { length: dayCount },
      (_, i) => new Date(Date.UTC(year, month, i + 1)),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );

  /* Newest first: the years anyone is likely to pick are the ones nearest the top,
     rather than a hundred entries down a list that starts in 1905. */
  const years = Array.from(
    { length: latest.getUTCFullYear() - earliest.getUTCFullYear() + 1 },
    (_, i) => latest.getUTCFullYear() - i,
  );

  const firstMonth = startOfMonth(earliest);
  const lastMonth = startOfMonth(latest);

  function jumpTo(nextYear: number, nextMonth: number) {
    setCursor(
      clamp(new Date(Date.UTC(nextYear, nextMonth, 1)), firstMonth, lastMonth),
    );
  }

  const popoverId = `${id}-calendar`;

  return (
    <div
      ref={containerRef}
      className="relative"
      /* Tabbing out of the last day closes the calendar. `relatedTarget` is null for
         a click on something unfocusable, which the pointer-down listener above
         already covers. */
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      {/* The same inert, 20.25px-wide box 19.5px in that `Field` gives the name and
          email icons, so all four fields keep one vertical line.

          Emphatically NOT a button, which is what this was first. `globals.css` gives
          every button a 44px min-height tap target, so the box grew to 44px while the
          glyph stayed 25px and — with no `items-center` on the flex — pinned itself to
          the top, sitting 9.5px above the centre the other three icons share. It is
          also unnecessary: `pointer-events-none` drops a click on the glyph through to
          the input underneath, whose own `onClick` opens the calendar. */}
      <span
        aria-hidden
        /* `justify-start`, where `Field` centres. The other three glyphs are each
           exactly 20.25 wide, so they fill the box and their left edges form a rail
           at 19.5px; a calendar at matched height is narrower than that, and centring
           it parked it 2.4px inside the rail. Aligning left puts all four icons on
           one edge, which is what the eye follows down a column of fields. */
        className="pointer-events-none absolute top-1/2 left-[19.5px] flex w-[20.25px] -translate-y-1/2 justify-start text-ink-faint"
      >
        {/* Sized down, and the two numbers are not arbitrary. This glyph belongs to
            the icons file's RESULT-SCREEN set — it is the Age factor, drawn 22.5×25 —
            while the field icons beside it are 20.25×17.25 and 20.25×15.75. Left at
            its own size it towered over them, and being 22.5 wide in a 20.25 box it
            was also a flex item wider than its container: it shrank to 20.25 and
            rendered 10% narrower than drawn.

            So it is scaled to CONTAIN inside the field-icon box — 17.25 tall, matching
            the name icons, times the drawn 22.5:25 aspect for the width — and
            `shrink-0` keeps flex from squashing it again. It centres in the 20.25 box
            rather than filling it, which leaves it 2.4px inside the left edge the
            other three share; matching their optical size is worth more than the
            2.4px, since size is what the eye reads down a column of fields. */}
        <Calendar className="h-[17.25px] w-[15.53px] shrink-0" />
      </span>

      <label htmlFor={id} className="sr-only">
        Date of birth
      </label>
      <input
        ref={inputRef}
        id={id}
        name="dob"
        /* Text, not `type="date"` — see the note at the top of this file. */
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        required
        placeholder="Date of Birth (YYYY-MM-DD)"
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-autocomplete="none"
        onChange={(e) => type(e.target.value)}
        /* Focus alone does NOT open the calendar; a click or ArrowDown does.
           Opening on focus reopened it instantly every time it closed, because
           picking a day and pressing Escape both hand focus back to this input —
           the calendar shut and the focus call sprang it again. It also means
           tabbing through the form no longer throws a calendar over the phone
           field on the way past. */
        onFocus={() => {
          /* Focus is in the text box now, so the grid must not snatch it back on the
             next render — the caret stays where the visitor put it. */
          setGrabFocus(false);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        className={`${FIELD} border-line-soft focus:border-brand`}
      />

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Choose a date of birth"
          /* Full width on a phone, where the field is narrow enough that a fixed
             320px box would hang off the side. */
          className="absolute top-[calc(100%+8px)] left-0 z-20 w-full rounded-[14px] border-[1.6px] border-line-soft bg-canvas p-3 shadow-[0_12px_32px_rgba(17,17,17,0.12)] sm:w-[320px]"
        >
          <div className="flex items-center gap-2">
            {/* Both jumps are native <select>s, for the reason the country picker
                gives: the OS list scrolls, takes type-ahead and needs no keyboard
                handling of ours — which matters most for the year, where the list is
                a hundred entries long. `appearance-none` and a chevron of our own
                only replace the platform's arrow, so the control still opens the
                OS list; without it the two boxes wear macOS chrome in the middle of
                a popover drawn entirely in the funnel's tokens.

                `text-base` on both: iOS zooms the page in on a focused control drawn
                below 16px, the same reason the country picker sets it. */}
            <label htmlFor={`${popoverId}-month`} className="sr-only">
              Month
            </label>
            <div className="relative flex-1">
              <select
                id={`${popoverId}-month`}
                value={month}
                onChange={(e) => jumpTo(year, Number(e.target.value))}
                className="peer h-9 w-full cursor-pointer appearance-none rounded-lg border-[1.6px] border-line-soft bg-canvas pr-7 pl-2 text-base text-ink focus:border-brand focus:outline-none"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-ink-faint peer-focus:text-brand"
              />
            </div>

            <label htmlFor={`${popoverId}-year`} className="sr-only">
              Year
            </label>
            <div className="relative w-[88px] shrink-0">
              <select
                id={`${popoverId}-year`}
                value={year}
                onChange={(e) => jumpTo(Number(e.target.value), month)}
                className="peer h-9 w-full cursor-pointer appearance-none rounded-lg border-[1.6px] border-line-soft bg-canvas pr-7 pl-2 text-base text-ink focus:border-brand focus:outline-none"
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-ink-faint peer-focus:text-brand"
              />
            </div>

            <button
              type="button"
              onClick={() => setCursor(shiftMonth(monthStart, -1))}
              disabled={monthStart <= firstMonth}
              aria-label="Previous month"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(shiftMonth(monthStart, 1))}
              disabled={monthStart >= lastMonth}
              aria-label="Next month"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-4 rotate-180" />
            </button>
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={`${MONTHS[month]} ${year}`}
            onKeyDown={onGridKeyDown}
            className="mt-3"
          >
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  role="columnheader"
                  aria-label={day}
                  className="flex h-8 items-center justify-center text-[12px] font-semibold text-ink-faint"
                >
                  {day}
                </div>
              ))}
            </div>

            {weeks.map((week) => (
              <div
                key={iso(week.find((d) => d !== null) ?? monthStart)}
                role="row"
                className="grid grid-cols-7"
              >
                {week.map((date, index) => {
                  if (date === null) {
                    /* The leading and trailing blanks are presentational, but the row
                       still has to hold seven cells or the grid roles don't line up
                       with the columns a screen reader announces. */
                    return (
                      <div
                        key={`pad-${index}`}
                        role="gridcell"
                        aria-disabled
                        className="h-9"
                      />
                    );
                  }
                  const key = iso(date);
                  const outOfRange = date < earliest || date > latest;
                  const isSelected = key === selectedIso;
                  const isFocused = key === iso(focusDay);
                  return (
                    <div key={key} role="gridcell" aria-selected={isSelected}>
                      <button
                        type="button"
                        /* Roving tabindex: one stop for the whole grid, so Tab leaves
                           the calendar rather than walking thirty-odd days. */
                        tabIndex={isFocused ? 0 : -1}
                        data-focused={isFocused}
                        disabled={outOfRange}
                        onClick={() => choose(date)}
                        onFocus={() => setFocusDay(date)}
                        className={`flex size-9 items-center justify-center rounded-lg text-[14px] transition-colors disabled:opacity-25 ${
                          isSelected
                            ? "bg-brand font-semibold text-ink-inverse"
                            : "text-ink hover:bg-surface disabled:hover:bg-transparent"
                        }`}
                      >
                        {date.getUTCDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
