"use client";

import { useMemo, useRef, useState } from "react";
import { DemoGraphScene } from "@/components/3d/dynamic";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { SITE } from "@/data/site";
import {
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

  // Escape hatch for when the API is unreachable: carry what they have already
  // typed into their own mail client rather than making them retype it.
  const mailtoFallback = useMemo(() => {
    const lines = [
      `Name: ${values.name}`,
      `Institution: ${values.institution}`,
      `Role: ${values.role}`,
      `Research area: ${values.researchArea}`,
      `Workflow: ${values.workflow.join(", ")}`,
      `Current tools: ${values.currentTools}`,
      "",
      `Goal: ${values.goal}`,
      "",
      values.message,
    ];
    const subject = `Demo request${values.institution ? ` — ${values.institution}` : ""}`;
    return `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
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
            {/* A way through that does not depend on the thing that just failed. */}
            <p className="mt-2 text-ink-muted">
              Or email{" "}
              <a
                href={mailtoFallback}
                className="text-ink underline underline-offset-2 hover:opacity-80"
              >
                {SITE.contactEmail}
              </a>{" "}
              directly — this opens a draft with what you have entered so far.
            </p>
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-6">
          <legend className="mono-label mb-4">Your message</legend>

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
              label="Email"
              required
              type="email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
            />
          </div>

          <TextArea
            label="Message"
            required
            value={values.message}
            onChange={set("message")}
            error={errors.message}
            rows={5}
            placeholder="A question, a problem you ran into, or what you are trying to record."
          />
        </fieldset>

        <details className="rounded-lg border border-line bg-surface/40 p-5 open:pb-6">
          <summary className="cursor-pointer font-mono text-[12.5px] text-ink-muted">
            A little about your work (optional)
          </summary>

          <div className="mt-6 flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                label="Institution or company"
                value={values.institution ?? ""}
                onChange={set("institution")}
                error={errors.institution}
                autoComplete="organization"
              />
              <SelectField
                label="Role"
                value={values.role ?? ""}
                onChange={set("role") as (value: string) => void}
                options={ROLE_OPTIONS}
                error={errors.role}
                placeholder="Select the closest role"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                label="Research area"
                value={values.researchArea ?? ""}
                onChange={set("researchArea")}
                error={errors.researchArea}
                placeholder="e.g. detection in adverse weather, legged locomotion"
              />
              <SelectField
                label="Team size"
                value={values.teamSize ?? ""}
                onChange={set("teamSize") as (value: string) => void}
                options={TEAM_SIZE_OPTIONS}
                error={errors.teamSize}
                placeholder="Select a size"
              />
            </div>

            <CheckboxGroup
              label="Where does your synthetic data come from?"
              options={WORKFLOW_OPTIONS}
              selected={values.workflow}
              onToggle={toggleWorkflow}
              error={errors.workflow}
              hint="Select everything that applies."
            />

            <TextField
              label="Current tools"
              value={values.currentTools ?? ""}
              onChange={set("currentTools")}
              error={errors.currentTools}
              placeholder="e.g. Blender, PyTorch, W&B, Git"
            />

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
          </div>
        </details>

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
            {status === "submitting" ? "Sending…" : "Send message"}
          </Button>
          <p className="max-w-[54ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
            We only use this to respond to your message.
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
