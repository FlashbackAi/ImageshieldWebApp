/**
 * Boot-time configuration check.
 *
 * `register` runs once per server instance and must finish before any request is
 * served, which makes it the one place a misconfiguration can be caught while it is
 * still cheap. Without it the first sign of a missing `BACKEND_URL` or a placeholder
 * `FUNNEL_SECRET` is a failed request from a real visitor mid-funnel.
 *
 * Throwing here is deliberate: a server that cannot sign session cookies safely should
 * not come up and start handing out sessions.
 */
export async function register(): Promise<void> {
  // This file is also loaded in the edge runtime, where the server-only config module
  // (and the node crypto it leads to) has no business being imported. The env that
  // matters here belongs to the node server, so only check there.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertServerEnv } = await import("./lib/env");
  assertServerEnv();
}
