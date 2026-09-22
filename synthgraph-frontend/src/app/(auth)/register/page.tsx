import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Create account</h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          Set up access to your SynthGraph dashboard.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-[13.5px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-2 hover:opacity-80">
          Sign in
        </Link>
      </p>
    </div>
  );
}
