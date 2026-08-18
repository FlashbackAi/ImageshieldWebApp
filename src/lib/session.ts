import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Contact } from "./contact";

/**
 * The funnel's server-side memory: who we're mid-OTP with, and whether that phone
 * has since proved it's theirs.
 *
 * This exists because the score write lands on the SAME user record the app reads.
 * Without a server-held "this browser verified +1555…", any visitor could POST a
 * stranger's number and overwrite their Likeness Health Score. The client is never
 * asked which phone it's writing for — that only ever comes out of this cookie.
 *
 * Signed rather than stored: an HMAC over the payload keeps it tamper-proof without
 * introducing a session table (and so without touching the existing backend).
 * Nothing secret is inside — the user typed all of it — so it isn't encrypted.
 */
const COOKIE = "imageshield.funnel";

/** Long enough to read the SMS and retype it, short enough that a shared phone
 *  doesn't hand the next person a verified session. */
const PENDING_TTL_S = 15 * 60;

/** Survives the reload-the-result-page and come-back-later cases. */
const VERIFIED_TTL_S = 24 * 60 * 60;

export type FunnelSession = Contact & {
  verified: boolean;
  /** Epoch seconds. Checked on read — the cookie's own maxAge is only a hint the
   *  browser is free to ignore. */
  exp: number;
};

function secret(): string {
  const value = process.env.FUNNEL_SECRET;
  if (!value) {
    throw new Error(
      "FUNNEL_SECRET is not set — copy .env.example to .env.local and put a random string in it",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: FunnelSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string): FunnelSession | null {
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;

  const given = Buffer.from(mac);
  const expected = Buffer.from(sign(payload));
  // timingSafeEqual throws rather than returns false on a length mismatch.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as FunnelSession;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    // Signed by us but shaped by an older release.
    return null;
  }
}

async function write(session: FunnelSession, ttl: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    // Local dev is plain http, so this can't be unconditional.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

/** Called when the OTP goes out: remembers the details until the code comes back. */
export async function startSession(contact: Contact): Promise<void> {
  await write(
    { ...contact, verified: false, exp: now() + PENDING_TTL_S },
    PENDING_TTL_S,
  );
}

/** Called only after the backend accepts the code. */
export async function markVerified(session: FunnelSession): Promise<void> {
  await write(
    { ...session, verified: true, exp: now() + VERIFIED_TTL_S },
    VERIFIED_TTL_S,
  );
}

export async function readSession(): Promise<FunnelSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? decode(raw) : null;
}

/** For the routes that write to, or read from, the shared user record. */
export async function readVerifiedSession(): Promise<FunnelSession | null> {
  const session = await readSession();
  return session?.verified ? session : null;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}
