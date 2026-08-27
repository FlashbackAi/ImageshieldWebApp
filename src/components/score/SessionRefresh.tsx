"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShieldMark } from "@/components/ShieldMark";
import { STEP_PATHS } from "@/lib/funnel";

/**
 * Rotates a spent access token and re-renders the page behind it.
 *
 * The result screen renders on the server, and a server component cannot set a
 * cookie — HTTP has no way to send one once a response has started streaming. /v1
 * refresh tokens ROTATE, so a render that refreshed would spend the refresh token
 * and have nowhere to put its replacement, turning a live session into a dead one.
 *
 * So the render stops at "this needs refreshing" and this component finishes the job
 * from the browser, where the call lands in a route handler that can write the new
 * pair. It is a beat on screen, not a screen: a visitor only ever sees it when they
 * come back after their access token ran out.
 */
export function SessionRefresh() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  /* React runs effects twice in development, and this one spends a refresh token —
     the second call would present a token the first had already rotated away. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let live = true;
    fetch("/api/session/refresh", { method: "POST" })
      .then((res) => {
        if (!live) return;
        if (res.ok) return router.refresh();
        // 401 is the session genuinely gone; anything else is worth offering a retry.
        if (res.status === 401) return router.replace(STEP_PATHS.details);
        setFailed(true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
    };
  }, [router]);

  return (
    <div role="status" className="flex flex-col items-center text-center">
      <ShieldMark monotone className="w-[37px] text-brand" />
      {failed ? (
        <>
          <h1 className="mt-8 max-w-[420px] text-2xl leading-9 font-bold text-ink">
            We couldn&apos;t reach the server
          </h1>
          <p className="mt-4 max-w-[420px] text-base text-ink-muted">
            Your score is saved — this is just this request. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              started.current = false;
              router.refresh();
            }}
            className="mt-8 flex h-14 w-full max-w-[317px] items-center justify-center rounded-full bg-brand text-lg font-semibold text-ink-inverse transition-colors hover:bg-cta"
          >
            Try again
          </button>
        </>
      ) : (
        <h1 className="mt-8 max-w-[320px] text-2xl leading-9 font-bold text-ink">
          Loading your Likeness Health Score
          <sup className="align-[2px] text-[0.5em]">SM</sup>
        </h1>
      )}
    </div>
  );
}
