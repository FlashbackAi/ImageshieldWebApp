import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * The marketing site is drawn in Inter — matched against the V1 export glyph by
 * glyph. The funnel screens stay on Plus Jakarta Sans to match the mobile app, so
 * both faces load and each side of the product picks its own.
 *
 * Italic is a real cut here: the hero sets "Likeness Health Score" in it, and a
 * browser-sheared roman looks nothing like the design.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ImageShield",
  description: "Find out how exposed your likeness is online.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page paint under the notch; screens opt in with the safe-area padding.
  viewportFit: "cover",
  themeColor: "#380e99",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
