import { NextResponse } from "next/server";
import { demoRequestSchema, toFieldErrors } from "@/lib/demo-request";
import {
  isDemoEmailConfigured,
  sendDemoConfirmationEmail,
  sendDemoRequestEmail,
} from "@/lib/demo-email";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Receives demo requests and delivers them to the team.
 *
 * Two independent channels, both configuration:
 *   - Email, via Resend, when RESEND_API_KEY / DEMO_NOTIFY_TO / DEMO_NOTIFY_FROM
 *     are set. This is the one that matters in production.
 *   - An optional webhook forward, via DEMO_FORM_ENDPOINT, for a CRM or form
 *     service that wants the raw submission.
 *
 * Rate limited per client IP, because both channels spend something we pay for.
 *
 * With neither configured the request is validated and acknowledged, and the
 * submission is logged, so a local or preview deployment still behaves
 * correctly end to end.
 */
export async function POST(request: Request) {
  // Before parsing anything: the endpoint sends mail on our account, so the
  // cost of a flood is ours, not the caller's.
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again a little later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  // The honeypot is never filled in by a person. Checked against the raw body
  // and before validation on purpose: the schema also rejects a filled website,
  // and a 422 naming that field would tell a bot exactly which input to skip.
  // Silence, and a plausible success, are the whole point.
  if (typeof payload === "object" && payload !== null && "website" in payload && payload.website) {
    return NextResponse.json({ ok: true });
  }

  const parsed = demoRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Some fields need attention.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const { website: _honeypot, ...submission } = parsed.data;
  const receivedAt = new Date().toISOString();
  const endpoint = process.env.DEMO_FORM_ENDPOINT;

  if (!isDemoEmailConfigured() && !endpoint) {
    console.info("[demo-request] received (no delivery channel configured)", {
      institution: submission.institution,
      role: submission.role,
      receivedAt,
    });
    return NextResponse.json({ ok: true });
  }

  // Run every configured channel, and let one success carry the request: if the
  // email lands, the team has it, and telling the requester to retry would only
  // send it twice.
  const channels: Array<Promise<unknown>> = [];
  if (isDemoEmailConfigured()) channels.push(sendDemoRequestEmail(submission, receivedAt));
  if (endpoint) channels.push(forwardToEndpoint(endpoint, submission, receivedAt));

  const results = await Promise.allSettled(channels);
  for (const result of results) {
    if (result.status === "rejected") console.error("[demo-request] delivery failed", result.reason);
  }

  const delivered = results.some((result) => result.status === "fulfilled");

  // Best-effort, and only once the team actually has the request: confirming a
  // request that never arrived would be a lie to the person who sent it.
  if (delivered && isDemoEmailConfigured()) {
    try {
      await sendDemoConfirmationEmail(submission);
    } catch (error) {
      console.error("[demo-request] confirmation to requester failed", error);
    }
  }

  if (results.every((result) => result.status === "rejected")) {
    return NextResponse.json(
      { ok: false, error: "We could not record your request. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** POSTs the raw submission to a CRM, form service or internal API. */
async function forwardToEndpoint(
  endpoint: string,
  submission: Record<string, unknown>,
  receivedAt: string,
): Promise<void> {
  const token = process.env.DEMO_FORM_TOKEN;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...submission, receivedAt }),
  });

  if (!response.ok) {
    throw new Error(`Forwarding to DEMO_FORM_ENDPOINT failed with ${response.status}.`);
  }
}
