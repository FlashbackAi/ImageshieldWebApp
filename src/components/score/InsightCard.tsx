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
 * The card's ground fades out over its last 5% — the export's own gradient, which
 * stops the block ending on a hard edge against the white page.
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
  /** "title" sets row titles at 20px; "body" at 16px bold. See above. */
  emphasis?: "title" | "body";
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-b from-[#F4F2FA] via-[#F4F2FA] via-95% to-transparent px-6 pt-11 pb-12 sm:px-[92px]">
      <h2 className="text-2xl font-bold text-ink">{heading}</h2>

      <ul className="mt-8 flex flex-col gap-9">
        {rows.map(({ id, icon: Icon, title, body }) => (
          <li key={id} className="flex items-start gap-6">
            {/* The disc is a fixed 84px and the glyphs inside it are several
                different sizes, drawn at their own — centring rather than sizing
                them is what keeps a column of discs identical. */}
            <span className="flex size-[84px] shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
              <Icon />
            </span>
            <div className="pt-1">
              <h3
                className={
                  emphasis === "title"
                    ? "text-xl font-semibold text-ink"
                    : "text-base font-bold text-ink"
                }
              >
                {title}
              </h3>
              <p className="mt-1.5 max-w-[600px] text-base leading-6 text-ink-body">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
