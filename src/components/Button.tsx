import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-ink-inverse active:bg-brand-bright",
  secondary: "bg-surface text-ink active:bg-line-soft",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      // Full-width and tall: on a phone this is the only thing the thumb aims at.
      className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
