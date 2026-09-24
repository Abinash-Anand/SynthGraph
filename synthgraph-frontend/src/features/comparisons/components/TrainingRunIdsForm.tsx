"use client";

import { EntitySearchPicker } from "./EntitySearchPicker";

export function TrainingRunIdsForm({
  prefill,
  prefillNames,
  error,
}: {
  prefill?: string[];
  prefillNames?: Record<string, string>;
  error?: string;
}) {
  return (
    <EntitySearchPicker
      entityType="trainingRun"
      targetPath="/dashboard/compare/runs"
      prefillIds={prefill}
      prefillNames={prefillNames}
      error={error}
      label="training runs"
    />
  );
}
