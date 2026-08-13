import "server-only";

/**
 * Server-side gateway to the existing ImageShield backend
 * (~/Desktop/ImageShieldPhotoShare/server — the same API the mobile app uses).
 *
 * Browsers never call the backend directly. Route handlers under src/app/api/ call
 * this, so OTP rate limiting, secrets, and abuse policy stay in one place instead of
 * being re-implemented (and bypassable) in the client.
 */
const BACKEND_URL = process.env.BACKEND_URL;

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL is not set — copy .env.example to .env.local");
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
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
    );
  }

  return res.json() as Promise<T>;
}
