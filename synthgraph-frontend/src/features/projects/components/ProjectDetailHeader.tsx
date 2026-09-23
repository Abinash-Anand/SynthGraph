"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import {
  updateProjectSchema,
  type UpdateProjectFieldErrors,
  type UpdateProjectRequest,
} from "@/features/projects/schemas/project-schemas";
import type { Project } from "@/features/projects/types/project";
import { formatDate } from "@/shared/lib/format";
import { toFieldErrors } from "@/shared/lib/validation";

type Mode = "view" | "editing" | "archiving";

type UpdateResponse = { ok: boolean; error?: string; fields?: UpdateProjectFieldErrors; project?: Project };

export function ProjectDetailHeader({ project: initialProject }: { project: Project }) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [mode, setMode] = useState<Mode>("view");
  const [values, setValues] = useState<UpdateProjectRequest>({
    name: project.name,
    description: project.description ?? "",
  });
  const [errors, setErrors] = useState<UpdateProjectFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof UpdateProjectRequest>(key: K) => (value: UpdateProjectRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const startEditing = () => {
    setValues({ name: project.name, description: project.description ?? "" });
    setErrors({});
    setFormError(null);
    setMode("editing");
  };

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = updateProjectSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError("Check the highlighted fields.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        }),
      });
      const body = (await response.json()) as UpdateResponse;

      if (!response.ok || !body.ok || !body.project) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not update the project. Please try again.");
        return;
      }

      setProject(body.project);
      setMode("view");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  const onArchive = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Could not archive the project. Please try again.");
        setPending(false);
        return;
      }
      router.push("/dashboard/projects");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  };

  if (mode === "editing") {
    return (
      <form onSubmit={onSave} noValidate className="flex flex-col gap-4">
        {formError ? (
          <div role="alert" className="rounded-lg border border-bad/40 bg-bad/[0.05] p-3 text-[13.5px] text-ink">
            {formError}
          </div>
        ) : null}
        <TextField label="Name" required value={values.name ?? ""} onChange={set("name")} error={errors.name} />
        <TextArea
          label="Description"
          value={values.description ?? ""}
          onChange={set("description")}
          error={errors.description}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMode("view")} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 text-[14px] text-research-ink-muted">{project.description}</p>
          ) : null}
          <p className="mt-2 font-mono text-[11px] text-research-ink-muted">
            Created {formatDate(project.createdAt)}
          </p>
        </div>

        {mode === "archiving" ? (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-research-ink-muted">Archive this project?</span>
            <Button size="sm" variant="secondary" onClick={() => setMode("view")} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={onArchive} disabled={pending}>
              {pending ? "Archiving…" : "Confirm"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={startEditing}>
              Rename
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("archiving")}>
              Archive
            </Button>
          </div>
        )}
      </div>
      {mode === "view" && formError ? (
        <div role="alert" className="mt-3 rounded-lg border border-bad/40 bg-bad/[0.05] p-3 text-[13.5px] text-ink">
          {formError}
        </div>
      ) : null}
    </div>
  );
}
