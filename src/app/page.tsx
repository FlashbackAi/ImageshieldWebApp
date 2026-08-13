import type { Metadata, Viewport } from "next";
import { DownloadSection } from "@/components/landing/DownloadSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProtectsSection } from "@/components/landing/ProtectsSection";

export const metadata: Metadata = {
  title: "ImageShield — What is your Likeness Health Score℠?",
  description:
    "Answer a few quick questions and find out how at risk you are of deepfakes, impersonation, and photo misuse.",
};

export const viewport: Viewport = {
  // The funnel is white-on-brand; the landing page is a black canvas.
  themeColor: "#000000",
};

export default function LandingPage() {
  return (
    <main className="bg-night font-site">
      <HeroSection />
      <ProtectsSection />
      <DownloadSection />
    </main>
  );
}
