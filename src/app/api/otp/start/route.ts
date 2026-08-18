import { backendFetch, BackendError } from "@/lib/api";
import { validateContact } from "@/lib/contact";
import { allowOtpSend } from "@/lib/rate-limit";
import { startSession } from "@/lib/session";

/**
 * POST /api/otp/start — { fullName, email, phone }
 *
 * Sends the code and remembers the details in a signed cookie. Nothing is written
 * to the shared user record here: an unverified phone number is just a claim, and
 * acting on it is how a stranger's score would get overwritten.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = validateContact(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { contact } = parsed;

  const allowed = allowOtpSend(request, contact.phone);
  if (!allowed.ok) {
    return Response.json({ error: allowed.error }, { status: allowed.status });
  }

  try {
    await backendFetch("/initiate-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: contact.phone }),
    });
  } catch (error) {
    // The backend answers 200 even when Twilio itself fails, so reaching here means
    // the backend is down or unreachable — not a bad phone number.
    console.error("otp/start failed", {
      status: error instanceof BackendError ? error.status : undefined,
      message: (error as Error).message,
    });
    return Response.json(
      { error: "Couldn't send your code. Please try again." },
      { status: 502 },
    );
  }

  await startSession(contact);

  // The phone goes back so the OTP screen can show which number it texted, without
  // trusting the client to keep holding it.
  return Response.json({ ok: true, phone: contact.phone });
}
