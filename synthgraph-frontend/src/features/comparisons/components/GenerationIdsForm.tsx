"use client";

import { EntitySearchPicker } from "./EntitySearchPicker";

export function GenerationIdsForm({
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
      entityType="generation"
      targetPath="/dashboard/compare"
      prefillIds={prefill}
      prefillNames={prefillNames}
      error={error}
      label="generations"
    />
  );
}
