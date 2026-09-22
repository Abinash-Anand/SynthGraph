"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  registerSchema,
  type RegisterFieldErrors,
  type RegisterRequest,
} from "@/features/auth/schemas/auth-schemas";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

// `confirmPassword` never leaves this component — it's a UX check, not part
// of the RegisterDto sent to the backend.
type FormValues = RegisterRequest & { confirmPassword: string };
type FieldErrors = RegisterFieldErrors & { confirmPassword?: string };

const EMPTY: FormValues = { email: "", password: "", confirmPassword: "" };

type RegisterResponse = { ok: boolean; error?: string; fields?: RegisterFieldErrors };

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof FormValues>(key: K) => (value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (values.password !== values.confirmPassword) {
      setErrors((current) => ({ ...current, confirmPassword: "Passwords do not match." }));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    const parsed = registerSchema.safeParse({ email: values.email, password: values.password });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as RegisterResponse;

      if (!response.ok || !body.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create your account. Please try again.");
        setStatus("error");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/[0.05] p-4 text-[14px] text-ink"
        >
          {formError}
        </div>
      ) : null}

      <TextField
        label="Email"
        required
        type="email"
        value={values.email}
        onChange={set("email")}
        error={errors.email}
        autoComplete="email"
      />
      <TextField
        label="Password"
        required
        type="password"
        hint="At least 8 characters."
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        autoComplete="new-password"
      />
      <TextField
        label="Confirm password"
        required
        type="password"
        value={values.confirmPassword}
        onChange={set("confirmPassword")}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <Button type="submit" size="lg" disabled={status === "submitting"} className="mt-2">
        {status === "submitting" ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
