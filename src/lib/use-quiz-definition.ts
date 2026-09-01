"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizDefinition } from "./quiz";

/**
 * The quiz definition, fetched once per tab and shared by every screen that needs it.
 *
 * The app's `useQuizDefinition` is the same hook against the same endpoint, and the
 * reasoning there applies here: the questions used to be a constant in the screen —
 * and a second copy of them in a `quiz-content.ts` this repo carried — so the two could
 * disagree with each other and both could disagree with the server. They now come from
 * the definition, and `quiz_version` comes with them.
 *
 * What this adds over the app's version is the sharing. Five screens ask for the
 * definition — the questions render from it, and `/details`, `/calculating` and the
 * score screen all run `quizIncomplete` against it before they let anyone stand on
 * them — and a per-component fetch would be five requests for bytes that are
 * identical. The promise below is the deduplication: whoever asks second awaits the
 * first one's, and the resolved value is kept for the rest of the tab's life.
 *
 * Module scope survives client-side navigation, so walking the funnel costs one
 * request. A full reload starts over, which the route's own `Cache-Control` makes
 * cheap.
 */

type State = {
  status: "loading" | "ready" | "failed";
  quiz: QuizDefinition | null;
  error: string | null;
};

const LOADING: State = { status: "loading", quiz: null, error: null };

/** Resolved definition, kept for the tab. Null until the first success. */
let cached: QuizDefinition | null = null;

/** In-flight fetch, so simultaneous mounts share one request. Cleared on failure so
 *  a retry is possible; kept on success is unnecessary — `cached` answers instead. */
let inFlight: Promise<QuizDefinition> | null = null;

async function fetchDefinition(): Promise<QuizDefinition> {
  const response = await fetch("/api/quiz-definition", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ?? "We couldn't load the quiz just now. Please try again.",
    );
  }
  return (await response.json()) as QuizDefinition;
}

function load(): Promise<QuizDefinition> {
  if (cached !== null) return Promise.resolve(cached);
  inFlight ??= fetchDefinition().then(
    (definition) => {
      cached = definition;
      inFlight = null;
      return definition;
    },
    (error: unknown) => {
      inFlight = null;
      throw error;
    },
  );
  return inFlight;
}

export function useQuizDefinition(): State & { reload: () => void } {
  /* Starts ready when the tab already has it, so a screen reached by client-side
     navigation renders the questions on its first paint instead of flashing a
     spinner at someone who has been answering them for a minute. */
  const [state, setState] = useState<State>(() =>
    cached === null ? LOADING : { status: "ready", quiz: cached, error: null },
  );
  /* Bumped by `reload` to re-run the effect below. A counter rather than calling the
     fetch from the handler directly, so there is one place that owns the request and
     one cancellation rule for it. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    /* Nothing to do: the initializer above already put the cached definition in state,
       and setting it again here would be a synchronous setState inside an effect —
       the cascading-render mistake React's lint rule exists to catch. */
    if (cached !== null) return;

    let cancelled = false;
    load().then(
      (quiz) => {
        if (!cancelled) setState({ status: "ready", quiz, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          status: "failed",
          quiz: null,
          error:
            error instanceof Error
              ? error.message
              : "We couldn't load the quiz just now. Please try again.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    /* Already have it — a retry is a no-op, and dropping back to `loading` here would
       leave the screen waiting on an effect that has nothing to fetch. */
    if (cached !== null) {
      setState({ status: "ready", quiz: cached, error: null });
      return;
    }
    /* A retry after a failure must actually re-ask. `cached` is untouched — a failure
       never writes to it — so only the dead in-flight slot needs clearing. */
    inFlight = null;
    setState(LOADING);
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
