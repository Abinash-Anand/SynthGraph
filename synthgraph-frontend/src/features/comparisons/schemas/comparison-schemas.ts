import { z } from "zod";

export const compareGenerationsSchema = z.object({
  generationIds: z
    .array(z.string().uuid("Each ID must be a valid UUID."))
    .min(2, "Enter at least 2 generation IDs.")
    .max(10, "Compare at most 10 generations at a time."),
});

export const compareTrainingRunsSchema = z.object({
  trainingRunIds: z
    .array(z.string().uuid("Each ID must be a valid UUID."))
    .min(2, "Enter at least 2 training run IDs.")
    .max(10, "Compare at most 10 training runs at a time."),
});

/** Splits newline- or comma-separated pasted IDs, trims, drops empties, dedupes. */
export function parseIdsInput(raw: string): string[] {
  const ids = raw
    .split(/[\n,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}
