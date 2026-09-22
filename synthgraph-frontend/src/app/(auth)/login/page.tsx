import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Sign in</h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          Access your SynthGraph projects and experiments.
        </p>
      </div>

      {registered === "1" ? (
        <div
          className="rounded-lg border border-ok/35 bg-ok/5 p-4 text-[14px] text-ink"
          role="status"
        >
          Account created. Sign in below.
        </div>
      ) : null}

      <LoginForm />

      <p className="text-center text-[13.5px] text-ink-muted">
        No account yet?{" "}
        <Link href="/register" className="text-ink underline underline-offset-2 hover:opacity-80">
          Create one
        </Link>
      </p>
    </div>
  );
}
