"use client";

import { createContext, useContext, useId, useState } from "react";
import { ChevronDown } from "@/components/landing/icons";

/**
 * The old site's FAQ accordion, rebuilt.
 *
 * imageshield.com draws these with Radix (`type="single" collapsible`) — one row
 * open at a time, clicking the open row closes it, 0.2s ease-out on the height.
 * That is the whole contract, and it is small enough to own outright rather than
 * pull Radix in for one page.
 *
 * The one place this deliberately diverges: Radix unmounts a closed panel, so on
 * the live site the answers exist only in the page's JSON-LD as far as a crawler
 * is concerned. Here every answer stays in the DOM and is collapsed with a
 * `0fr → 1fr` grid row, which animates identically without needing the measured
 * height Radix keeps in a CSS variable. Closed panels are `inert`, so they stay
 * out of the tab order and the accessibility tree the same way.
 */
type AccordionState = {
  openValue: string | null;
  toggle: (value: string) => void;
  /** Namespaces panel ids, so two accordions may reuse the same item values. */
  scope: string;
};

const AccordionContext = createContext<AccordionState | null>(null);

/** One section's worth of rows. Each section on the page gets its own root. */
export function Accordion({ children }: { children: React.ReactNode }) {
  const [openValue, setOpenValue] = useState<string | null>(null);
  const scope = useId();

  return (
    <AccordionContext
      value={{
        openValue,
        toggle: (value) =>
          setOpenValue((current) => (current === value ? null : value)),
        scope,
      }}
    >
      <div className="space-y-4">{children}</div>
    </AccordionContext>
  );
}

export function AccordionItem({
  value,
  question,
  children,
}: {
  value: string;
  question: string;
  children: React.ReactNode;
}) {
  const accordion = useContext(AccordionContext);
  if (!accordion) {
    throw new Error("<AccordionItem> must be rendered inside an <Accordion>.");
  }

  const open = accordion.openValue === value;
  const panelId = `${accordion.scope}-${value}`;

  return (
    <div className="border-b border-line-legacy">
      <h3 className="flex">
        <button
          type="button"
          onClick={() => accordion.toggle(value)}
          aria-expanded={open}
          aria-controls={panelId}
          // `gap-4` is the one addition to the old site's trigger, which sets none:
          // the longest questions wrap to the full measure on a phone and the last
          // line runs into the chevron without it.
          className="flex flex-1 items-center justify-between gap-4 py-4 text-left font-medium transition-all hover:underline"
        >
          {question}
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>

      <div
        id={panelId}
        inert={!open}
        className={`grid text-sm transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
