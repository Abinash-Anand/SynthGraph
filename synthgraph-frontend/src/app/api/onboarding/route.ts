import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/features/auth/server/session";
import { markOnboardingSeen } from "@/features/onboarding/server/onboarding-state";
import { ONBOARDING_KEYS } from "@/features/onboarding/types/onboarding";

const bodySchema = z.object({
  key: z.enum(ONBOARDING_KEYS),
  version: z.number().int().positive(),
});

/** Records that a tour/checklist was completed, skipped, or dismissed. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  await markOnboardingSeen(session.user.id, parsed.data.key, parsed.data.version);
  return NextResponse.json({ ok: true });
}
