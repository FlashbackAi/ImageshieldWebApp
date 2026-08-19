/**
 * Server-side gateway to the existing ImageShield backend
 * (~/Desktop/ImageShieldPhotoShare/server — the same API the mobile app uses).
 *
 * Browsers never call the backend directly. Route handlers under src/app/api/ call
 * this, so OTP rate limiting, secrets, and abuse policy stay in one place instead of
 * being re-implemented (and bypassable) in the client.
 */
import "server-only";

import { backendBaseUrl } from "./env";

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Raw response body. Kept because status alone isn't enough: /verify-otp
     *  answers 400 for a wrong code, which is a normal outcome to relay to the
     *  user, not a fault to log. */
    readonly body: string = "",
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${backendBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    // The funnel is live data; nothing here should be cached by Next.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new BackendError(
      `${init.method ?? "GET"} ${path} failed`,
      res.status,
      await res.text().catch(() => ""),
    );
  }

  return res.json() as Promise<T>;
}
