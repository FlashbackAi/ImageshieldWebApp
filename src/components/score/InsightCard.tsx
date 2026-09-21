/**
 * The lavender card the export uses twice: "Your risk factors" and "Immediate
 * Recommendations".
 *
 * Both are the same object — a heading over a list of rows, each row an outlined
 * glyph in a white disc beside a title and a paragraph — so they are one component
 * taking different rows rather than two that have to be kept in step.
 *
 * The two differ in exactly one way, and it is deliberate: a risk factor's title is
 * a noun the eye can land on ("Age", "Gender"), so it is set large; a recommendation's
 * title is a whole instruction ("Sign up for YouTube's free likeness detection
 * service"), so it is set at body size in bold. Setting the sentence at the noun's
 * size would make the card read as three competing headlines. `emphasis` picks which.
 *
 * On a phone that distinction is dropped, because the export drops it: at 403px the
 * column is too narrow for a 20px noun to sit on one line beside an 84px disc, so
 * both cards set their titles at 15px bold and the whole card shrinks with them —
 * 59px discs, a 16px radius and a flat ground.
 *
 * That flat ground is the other phone-only change. The card's ground fades out over
 * its last 5% — the export's own gradient, which stops the block ending on a hard
 * edge against the white page — but a 24px fade eats the bottom corners of a 16px
 * radius, so below `sm` the fill is flat and the corners survive.
 */
export type InsightRow = {
  id: string;
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
};

export function InsightCard({
  heading,
  rows,
  emphasis = "title",
}: {
  heading: string;
  rows: readonly InsightRow[];
  /** "title" sets row titles at 20px; "body" at 16px bold. Both 15px below `sm`. */
  emphasis?: "title" | "body";
}) {
  return (
    <section className="rounded-2xl bg-[#F4F2FA] px-5 pt-8 pb-8 sm:rounded-3xl sm:bg-gradient-to-b sm:from-[#F4F2FA] sm:via-[#F4F2FA] sm:via-95% sm:to-transparent sm:px-[92px] sm:pt-11 sm:pb-12">
      <h2 className="text-[17px] leading-6 font-bold text-ink sm:text-2xl sm:leading-8">
        {heading}
      </h2>

      <ul className="mt-6 flex flex-col gap-[18px] sm:mt-8 sm:gap-9">
        {rows.map(({ id, icon: Icon, title, body }) => (
          <li key={id} className="flex items-start gap-3 sm:gap-6">
            {/* The disc is a fixed size and the glyphs inside it are several
                different sizes, drawn at their own — centring rather than sizing
                them is what keeps a column of discs identical. */}
            <span className="flex size-[59px] shrink-0 items-center justify-center rounded-full bg-canvas text-ink sm:size-[84px]">
              <Icon />
            </span>
            <div className="sm:pt-1">
              <h3
                className={
                  emphasis === "title"
                    ? "text-[15px] leading-5 font-bold text-ink sm:text-xl sm:leading-7 sm:font-semibold"
                    : "text-[15px] leading-5 font-bold text-ink sm:text-base sm:leading-6"
                }
              >
                {title}
              </h3>
              <p className="mt-1 max-w-[600px] text-[14px] leading-[19px] text-ink-body sm:mt-1.5 sm:text-base sm:leading-6">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
