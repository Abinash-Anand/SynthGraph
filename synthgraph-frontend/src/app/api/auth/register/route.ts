import { NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/schemas/auth-schemas";
import { registerUser } from "@/features/auth/server/auth-api";
import { ConflictError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    await registerUser(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    console.error("auth.register.failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create your account. Please try again." },
      { status: 502 },
    );
  }
}
