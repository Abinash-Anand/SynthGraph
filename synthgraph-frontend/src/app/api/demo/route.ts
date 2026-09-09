import { NextResponse } from "next/server";
import { demoRequestSchema, toFieldErrors } from "@/lib/demo-request";

/**
 * Receives demo requests.
 *
 * Where the request goes is configuration, not code: set DEMO_FORM_ENDPOINT to
 * a form service, CRM webhook or internal API. With no endpoint configured the
 * request is validated and acknowledged, and the submission is logged so a
 * local or preview deployment still behaves correctly end to end.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = demoRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Some fields need attention.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  // The honeypot is never filled in by a person.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { website: _honeypot, ...submission } = parsed.data;
  const endpoint = process.env.DEMO_FORM_ENDPOINT;

  if (!endpoint) {
    console.info("[demo-request] received (no DEMO_FORM_ENDPOINT configured)", {
      institution: submission.institution,
      role: submission.role,
      receivedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const token = process.env.DEMO_FORM_TOKEN;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...submission, receivedAt: new Date().toISOString() }),
    });

    if (!response.ok) {
      console.error("[demo-request] forwarding failed", response.status);
      return NextResponse.json(
        { ok: false, error: "We could not record your request. Please try again shortly." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[demo-request] forwarding error", error);
    return NextResponse.json(
      { ok: false, error: "We could not record your request. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
