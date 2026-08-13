"use client";

import { useEffect, useRef } from "react";

/**
 * The ad, playing behind the hero copy.
 *
 * Muted + `playsInline` are what let iOS autoplay at all. The clip is decorative —
 * every word it carries is also in the DOM as text — so it's hidden from assistive
 * tech and frozen on its poster frame for anyone who asked for less motion.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const video = ref.current;
      if (!video) return;
      if (query.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        void video.play().catch(() => {
          /* Autoplay can still be refused (low power mode); the poster stands in. */
        });
      }
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      // The file is faststart-muxed, so the browser can start on the first bytes
      // rather than waiting out the whole 2 MB.
      preload="auto"
      poster="/media/hero-poster.jpg"
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 size-full object-cover"
    >
      <source src="/media/hero-ad.mp4" type="video/mp4" />
    </video>
  );
}
