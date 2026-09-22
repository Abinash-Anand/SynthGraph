"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  loginSchema,
  type LoginFieldErrors,
  type LoginRequest,
} from "@/features/auth/schemas/auth-schemas";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: LoginRequest = { email: "", password: "" };

type LoginResponse = { ok: boolean; error?: string; fields?: LoginFieldErrors };

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginRequest>(EMPTY);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof LoginRequest>(key: K) => (value: LoginRequest[K]) => {
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

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as LoginResponse;

      if (!response.ok || !body.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not sign you in. Please try again.");
        setStatus("error");
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        autoComplete="current-password"
      />

      <Button type="submit" size="lg" disabled={status === "submitting"} className="mt-2">
        {status === "submitting" ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
