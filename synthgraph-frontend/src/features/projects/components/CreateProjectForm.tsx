"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import {
  createProjectSchema,
  type CreateProjectFieldErrors,
  type CreateProjectRequest,
} from "@/features/projects/schemas/project-schemas";
import type { Project } from "@/features/projects/types/project";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: CreateProjectRequest = { name: "", description: "" };

type CreateResponse = { ok: boolean; error?: string; fields?: CreateProjectFieldErrors; project?: Project };

export function CreateProjectForm() {
  const router = useRouter();
  const [values, setValues] = useState<CreateProjectRequest>(EMPTY);
  const [errors, setErrors] = useState<CreateProjectFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CreateProjectRequest>(key: K) => (value: CreateProjectRequest[K]) => {
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

    const parsed = createProjectSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        }),
      });
      const body = (await response.json()) as CreateResponse;

      if (!response.ok || !body.ok || !body.project) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create the project. Please try again.");
        setStatus("error");
        return;
      }

      router.push(`/dashboard/projects/${body.project.id}`);
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
        label="Name"
        required
        value={values.name}
        onChange={set("name")}
        error={errors.name}
      />
      <TextArea
        label="Description"
        value={values.description ?? ""}
        onChange={set("description")}
        error={errors.description}
      />

      <Button type="submit" size="lg" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
