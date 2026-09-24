"use client";

import { FloatingPortal } from "@floating-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/features/projects/types/project";
import { useTrainingRunKeys } from "@/features/reports/hooks/useTrainingRunKeys";
import { cn } from "@/lib/utils";
import { useFloatingDropdown } from "@/shared/ui/useFloatingDropdown";
import type { TrainingRunSearchField, TrainingRunSearchOperator } from "../types/report";

const FIELD_OPTIONS: TrainingRunSearchField[] = ["parameters", "metrics"];
const OP_OPTIONS: Array<{ value: TrainingRunSearchOperator; label: string }> = [
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater than or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less than or equal" },
  { value: "eq", label: "= equal to" },
];

export function TrainingRunSearchForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "");
  const [field, setField] = useState<TrainingRunSearchField>(
    (searchParams.get("field") as TrainingRunSearchField) ?? "parameters",
  );
  const [key, setKey] = useState(searchParams.get("key") ?? "");
  const [isKeyOpen, setIsKeyOpen] = useState(false);
  const [op, setOp] = useState<TrainingRunSearchOperator>(
    (searchParams.get("op") as TrainingRunSearchOperator) ?? "gt",
  );
  const [value, setValue] = useState(searchParams.get("value") ?? "");

  const { keys, isLoadingKeys } = useTrainingRunKeys(field, projectId || undefined);
  const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingDropdown({
    isOpen: isKeyOpen,
    onOpenChange: setIsKeyOpen,
  });

  const filteredKeys = useMemo(() => {
    const needle = key.trim().toLowerCase();
    if (!needle) return keys;
    return keys.filter((candidate) => candidate.toLowerCase().includes(needle));
  }, [keys, key]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (projectId) next.set("projectId", projectId);
    next.set("field", field);
    next.set("key", key.trim());
    next.set("op", op);
    next.set("value", value);
    router.push(`?${next.toString()}`);
  };

  return (
    // flex-nowrap + overflow-x-auto, not flex-wrap: a query-builder row
    // that wraps onto a second line loses its left-to-right reading order
    // (Project -> Field -> Key -> Operator -> Value -> Search) and the
    // wrapped row can land underneath an open dropdown from the row above.
    // Horizontal scroll on narrow viewports keeps the row intact instead.
    <form onSubmit={onSubmit} className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-1">
      <label className="flex shrink-0 flex-col gap-2 text-[13.5px] text-research-ink">
        Project
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-[180px] rounded-md border border-research-border bg-research-bg px-3 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
        >
          <option value="" className="bg-research-panel text-research-ink">
            All projects
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id} className="bg-research-panel text-research-ink">
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex shrink-0 flex-col gap-2 text-[13.5px] text-research-ink">
        Field
        <select
          value={field}
          onChange={(e) => setField(e.target.value as TrainingRunSearchField)}
          className="w-[140px] rounded-md border border-research-border bg-research-bg px-3 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
        >
          {FIELD_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-research-panel text-research-ink">
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="flex shrink-0 flex-col gap-2 text-[13.5px] text-research-ink">
        <label htmlFor="training-run-search-key">Key</label>
        <input
          id="training-run-search-key"
          ref={refs.setReference}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. lr"
          autoComplete="off"
          required
          className="w-[160px] rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
          {...getReferenceProps({ onFocus: () => setIsKeyOpen(true) })}
        />

        {/* Portaled via Floating UI - a `position: absolute` menu anchored
            to this cell used to render underneath (or shifted awkwardly
            against) the Operator/Value/Project fields in this same row.
            A floating, viewport-positioned menu floats above the whole
            row instead, without affecting any sibling's layout. */}
        {isKeyOpen ? (
          <FloatingPortal>
            <div
              // refs.setFloating is Floating UI's documented callback ref
              // setter, not a `.current` read - nothing to memoize here.
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 overflow-y-auto rounded-lg border border-research-border bg-research-panel p-1.5 shadow-lg"
              {...getFloatingProps()}
            >
              {isLoadingKeys ? (
                <p className="px-2.5 py-2 text-[13px] text-research-ink-muted">Loading keys…</p>
              ) : filteredKeys.length === 0 ? (
                <p className="px-2.5 py-2 text-[13px] text-research-ink-muted">
                  {keys.length === 0
                    ? `No ${field} keys captured yet.`
                    : `No ${field} keys match "${key.trim()}".`}
                </p>
              ) : (
                filteredKeys.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => {
                      setKey(candidate);
                      setIsKeyOpen(false);
                    }}
                    className={cn(
                      "block w-full truncate rounded-md px-2.5 py-2 text-left font-mono text-[13px] transition-colors",
                      candidate === key
                        ? "bg-research-accent-subtle/10 text-research-ink"
                        : "text-research-ink-secondary hover:bg-research-elevated hover:text-research-ink",
                    )}
                  >
                    {candidate}
                  </button>
                ))
              )}
            </div>
          </FloatingPortal>
        ) : null}
      </div>

      <label className="flex shrink-0 flex-col gap-2 text-[13.5px] text-research-ink">
        Operator
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as TrainingRunSearchOperator)}
          className="w-[220px] rounded-md border border-research-border bg-research-bg px-3 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
        >
          {OP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-research-panel text-research-ink">
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex shrink-0 flex-col gap-2 text-[13.5px] text-research-ink">
        Value
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-[120px] rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink tabular-nums focus:border-research-accent-subtle focus:outline-none"
        />
      </label>

      <Button type="submit" size="md" className="shrink-0">
        Search
      </Button>
    </form>
  );
}
