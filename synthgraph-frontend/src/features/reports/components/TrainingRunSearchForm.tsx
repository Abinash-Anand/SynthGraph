"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTrainingRunKeys } from "@/features/reports/hooks/useTrainingRunKeys";
import type { TrainingRunSearchField, TrainingRunSearchOperator } from "../types/report";

const FIELD_OPTIONS: TrainingRunSearchField[] = ["parameters", "metrics"];
const OP_OPTIONS: Array<{ value: TrainingRunSearchOperator; label: string }> = [
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater than or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less than or equal" },
  { value: "eq", label: "= equal to" },
];

export function TrainingRunSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;
  const keyContainerRef = useRef<HTMLDivElement>(null);

  const [field, setField] = useState<TrainingRunSearchField>(
    (searchParams.get("field") as TrainingRunSearchField) ?? "parameters",
  );
  const [key, setKey] = useState(searchParams.get("key") ?? "");
  const [isKeyOpen, setIsKeyOpen] = useState(false);
  const [op, setOp] = useState<TrainingRunSearchOperator>(
    (searchParams.get("op") as TrainingRunSearchOperator) ?? "gt",
  );
  const [value, setValue] = useState(searchParams.get("value") ?? "");

  const { keys, isLoadingKeys } = useTrainingRunKeys(field, projectId);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (keyContainerRef.current && !keyContainerRef.current.contains(event.target as Node)) {
        setIsKeyOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredKeys = useMemo(() => {
    const needle = key.trim().toLowerCase();
    if (!needle) return keys;
    return keys.filter((candidate) => candidate.toLowerCase().includes(needle));
  }, [keys, key]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    next.set("field", field);
    next.set("key", key.trim());
    next.set("op", op);
    next.set("value", value);
    router.push(`?${next.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
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

      <div ref={keyContainerRef} className="relative flex flex-col gap-2 text-[13.5px] text-research-ink">
        <label htmlFor="training-run-search-key">Key</label>
        <input
          id="training-run-search-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onFocus={() => setIsKeyOpen(true)}
          placeholder="e.g. lr"
          autoComplete="off"
          required
          className="w-[160px] rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
        />

        {/* Normal document flow, not an absolute overlay - an overlay here
            would visually cover (and intercept clicks intended for)
            whatever page content sits below the form. */}
        {isKeyOpen ? (
          <div className="max-h-[280px] w-[220px] overflow-y-auto rounded-lg border border-research-border bg-research-panel p-1.5 shadow-lg">
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
        ) : null}
      </div>

      <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
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

      <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
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

      <Button type="submit" size="md">
        Search
      </Button>
    </form>
  );
}
