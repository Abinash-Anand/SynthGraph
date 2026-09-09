"use client";

import { useMemo, useRef, useState } from "react";
import { DemoGraphScene } from "@/components/3d/dynamic";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup, SelectField, TextArea, TextField } from "@/components/ui/Field";
import {
  DATASET_SCALE_OPTIONS,
  EMPTY_DEMO_REQUEST,
  ROLE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  WORKFLOW_OPTIONS,
  demoRequestSchema,
  toFieldErrors,
  type DemoFieldErrors,
  type DemoRequest,
} from "@/lib/demo-request";
import { DemoSuccess } from "./DemoSuccess";

type Status = "idle" | "submitting" | "error";

export function DemoForm() {
  const [values, setValues] = useState<DemoRequest>(EMPTY_DEMO_REQUEST);
  const [errors, setErrors] = useState<DemoFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof DemoRequest>(key: K) => (value: DemoRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  /**
   * Which parts of the provenance graph the visitor has described so far.
   * The graph is a reflection of the form, never a gate on it.
   */
  const activeNodes = useMemo(() => {
    const active: string[] = [];
    if (values.name || values.institution || values.role) active.push("researcher");
    if (values.workflow.length > 0 || values.currentTools) active.push("workflow");
    if (values.generator || values.workflow.length > 0) active.push("generation");
    if (values.datasetScale || values.researchArea) active.push("dataset");
    if (values.trainingFramework) active.push("training");
    if (values.experimentTracking || values.goal) active.push("evaluation");
    return active;
  }, [values]);

  const toggleWorkflow = (option: string) => {
    setValues((current) => {
      const typed = option as DemoRequest["workflow"][number];
      const has = current.workflow.includes(typed);
      return {
        ...current,
        workflow: has
          ? current.workflow.filter((item) => item !== typed)
          : [...current.workflow, typed],
      };
    });
    setErrors((current) => {
      if (!current.workflow) return current;
      const next = { ...current };
      delete next.workflow;
      return next;
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = demoRequestSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setStatus("error");
      setFormError("Some fields need attention before we can send this.");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        fields?: DemoFieldErrors;
      };

      if (!response.ok || !body.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "We could not send your request. Please try again.");
        setStatus("error");
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError(
        "We could not reach the server. Check your connection and try again, or email us directly.",
      );
      setStatus("error");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  };

  if (submitted) return <DemoSuccess />;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
        {formError ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border border-bad/40 bg-bad/[0.05] p-4 text-[14px] text-ink outline-none"
          >
            {formError}
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-6">
          <legend className="mono-label mb-4">You</legend>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Name"
              required
              value={values.name}
              onChange={set("name")}
              error={errors.name}
              autoComplete="name"
            />
            <TextField
              label="Work email"
              required
              type="email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Institution or company"
              required
              value={values.institution}
              onChange={set("institution")}
              error={errors.institution}
              autoComplete="organization"
            />
            <SelectField
              label="Role"
              required
              value={values.role}
              onChange={set("role") as (value: string) => void}
              options={ROLE_OPTIONS}
              error={errors.role}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Research area"
              required
              value={values.researchArea}
              onChange={set("researchArea")}
              error={errors.researchArea}
              placeholder="e.g. object detection in adverse weather"
            />
            <SelectField
              label="Team size"
              required
              value={values.teamSize}
              onChange={set("teamSize") as (value: string) => void}
              options={TEAM_SIZE_OPTIONS}
              error={errors.teamSize}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-6">
          <legend className="mono-label mb-4">Your workflow</legend>

          <CheckboxGroup
            label="Current synthetic-data workflow"
            options={WORKFLOW_OPTIONS}
            selected={values.workflow}
            onToggle={toggleWorkflow}
            error={errors.workflow}
            hint="Select everything that applies."
          />

          <TextField
            label="Current tools"
            required
            value={values.currentTools}
            onChange={set("currentTools")}
            error={errors.currentTools}
            placeholder="e.g. Blender, PyTorch, W&B, Git, lab NAS"
          />

          <TextArea
            label="What would you like to reproduce or track?"
            required
            value={values.goal}
            onChange={set("goal")}
            error={errors.goal}
            rows={3}
            placeholder="The experiment or result you most want to be able to reconstruct."
          />

          <TextArea
            label="Message"
            required
            value={values.message}
            onChange={set("message")}
            error={errors.message}
            rows={4}
            placeholder="Anything else about your setup that would help us prepare a useful demo."
          />
        </fieldset>

        <fieldset className="flex flex-col gap-6">
          <legend className="mono-label mb-4">Optional context</legend>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Generator"
              value={values.generator ?? ""}
              onChange={set("generator")}
              placeholder="Blender 4.2, custom simulator…"
            />
            <TextField
              label="Training framework"
              value={values.trainingFramework ?? ""}
              onChange={set("trainingFramework")}
              placeholder="PyTorch, JAX…"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="Experiment tracking tool"
              value={values.experimentTracking ?? ""}
              onChange={set("experimentTracking")}
              placeholder="W&B, MLflow, none…"
            />
            <SelectField
              label="Dataset scale"
              value={values.datasetScale ?? ""}
              onChange={set("datasetScale") as (value: string) => void}
              options={DATASET_SCALE_OPTIONS}
              placeholder="Select a range"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="GitHub"
              value={values.github ?? ""}
              onChange={set("github")}
              placeholder="github.com/…"
            />
            <TextField
              label="LinkedIn"
              value={values.linkedin ?? ""}
              onChange={set("linkedin")}
              placeholder="linkedin.com/in/…"
            />
          </div>
        </fieldset>

        {/* Honeypot. Hidden from people and from assistive technology. */}
        <div className="hidden" aria-hidden>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website ?? ""}
            onChange={(event) => set("website")(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-8">
          <Button type="submit" size="lg" disabled={status === "submitting"} arrow className="sm:self-start">
            {status === "submitting" ? "Sending…" : "Request Demo Access"}
          </Button>
          <p className="max-w-[54ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
            We only use this information to evaluate and respond to your demo request.
          </p>
        </div>
      </form>

      <div className="lg:sticky lg:top-[calc(var(--nav-h)+32px)] lg:self-start">
        <div className="rounded-xl border border-line bg-surface/50 p-2">
          <DemoGraphScene active={activeNodes} />
        </div>
        <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.65] text-ink-muted">
          The graph fills in as you describe your workflow — the same shape a real experiment
          record takes: researcher, workflow, generation, dataset, training run, evaluation
          result.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {[
            ["Researcher", "researcher"],
            ["Workflow", "workflow"],
            ["Generation", "generation"],
            ["Dataset", "dataset"],
            ["Training", "training"],
            ["Evaluation", "evaluation"],
          ].map(([label, id]) => (
            <li
              key={id}
              className={
                activeNodes.includes(id)
                  ? "font-mono text-[11px] tracking-[0.1em] text-cyan"
                  : "font-mono text-[11px] tracking-[0.1em] text-ink-faint"
              }
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
