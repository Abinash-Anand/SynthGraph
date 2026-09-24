"use client";

import { useQuery } from "@tanstack/react-query";
import type { TrainingRunSearchField } from "@/features/reports/types/report";

async function fetchTrainingRunKeys(field: TrainingRunSearchField, projectId?: string): Promise<string[]> {
  const query = new URLSearchParams({ field, ...(projectId ? { projectId } : {}) });
  const response = await fetch(`/api/reports/training-run-keys?${query.toString()}`, { cache: "no-store" });
  const body = (await response.json()) as { ok: boolean; keys?: string[]; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to load keys.");
  }
  return body.keys ?? [];
}

/** Refetches whenever `field` (or the project filter) changes. */
export function useTrainingRunKeys(field: TrainingRunSearchField, projectId?: string) {
  const result = useQuery({
    queryKey: ["training-run-keys", field, projectId ?? null],
    queryFn: () => fetchTrainingRunKeys(field, projectId),
    staleTime: 30_000,
  });

  return {
    keys: result.data ?? [],
    isLoadingKeys: result.isLoading,
  };
}
