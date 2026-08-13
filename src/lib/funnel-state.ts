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
  answers: Record<string, string>;
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

export function saveAnswer(questionId: string, value: string): FunnelState {
  const { answers } = readFunnel();
  return writeFunnel({ answers: { ...answers, [questionId]: value } });
}

export function clearFunnel(): void {
  cache = EMPTY;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up.
  }
  for (const listener of listeners) listener();
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
