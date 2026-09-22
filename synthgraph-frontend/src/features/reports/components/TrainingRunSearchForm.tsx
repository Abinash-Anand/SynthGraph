"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
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

  const [field, setField] = useState<TrainingRunSearchField>(
    (searchParams.get("field") as TrainingRunSearchField) ?? "parameters",
  );
  const [key, setKey] = useState(searchParams.get("key") ?? "");
  const [op, setOp] = useState<TrainingRunSearchOperator>(
    (searchParams.get("op") as TrainingRunSearchOperator) ?? "gt",
  );
  const [value, setValue] = useState(searchParams.get("value") ?? "");

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

      <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
        Key
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. lr"
          required
          className="w-[140px] rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
        />
      </label>

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
