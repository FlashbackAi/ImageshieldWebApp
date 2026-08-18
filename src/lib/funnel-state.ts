"use client";

import { useSyncExternalStore } from "react";
import type { FunnelStep } from "./funnel";

/**
 * Funnel progress, persisted to sessionStorage.
 *
 * Mobile browsers evict background tabs aggressively. Without this, a user who takes
 * a call halfway through the quiz comes back to a blank step 1 and leaves. Answers
 * are written the moment they're picked, not on submit.
 *
 * sessionStorage (not localStorage) on purpose: a shared phone shouldn't hand the
 * next person someone else's answers or phone number.
 *
 * Exposed as an external store so screens read it during render instead of syncing
 * it into state from an effect — which would flash the empty step on every mount.
 */
const KEY = "imageshield.funnel.v1";

export type FunnelState = {
  /** A list for the multi-select questions, a bare string for the rest — the same
   *  shape `validateAnswers` expects, so this object POSTs straight through. */
  answers: Record<string, string | string[]>;
  phone?: string;
  lastStep?: FunnelStep;
};

const EMPTY: FunnelState = { answers: {} };

const listeners = new Set<() => void>();

/**
 * useSyncExternalStore compares snapshots by identity, so a fresh object per call
 * would loop forever. Parse once, then keep this in step with every write.
 */
let cache: FunnelState | null = null;

function load(): FunnelState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as FunnelState) } : EMPTY;
  } catch {
    // Private mode, quota, or a stale shape from an older release.
    return EMPTY;
  }
}

export function readFunnel(): FunnelState {
  cache ??= load();
  return cache;
}

export function writeFunnel(patch: Partial<FunnelState>): FunnelState {
  const next = { ...readFunnel(), ...patch };
  cache = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the funnel still works, it just won't survive a reload.
  }
  for (const listener of listeners) listener();
  return next;
}

export function saveAnswer(
  questionId: string,
  value: string | string[],
): FunnelState {
  const { answers } = readFunnel();
  return writeFunnel({ answers: { ...answers, [questionId]: value } });
}

/**
 * Adds or removes one option of a multi-select answer.
 *
 * Order follows the question's option list rather than the order they were tapped,
 * so re-picking the same set always produces the same array — otherwise a back-and-
 * forth would keep rewriting sessionStorage with a reshuffled list.
 */
export function toggleAnswer(
  questionId: string,
  option: string,
  options: readonly string[],
): FunnelState {
  const current = readFunnel().answers[questionId];
  const picked = new Set(Array.isArray(current) ? current : []);
  if (!picked.delete(option)) picked.add(option);
  return saveAnswer(
    questionId,
    options.filter((o) => picked.has(o)),
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server render has no storage, so it starts empty and re-renders after hydration. */
function serverSnapshot(): FunnelState {
  return EMPTY;
}

export function useFunnel(): FunnelState {
  return useSyncExternalStore(subscribe, readFunnel, serverSnapshot);
}
