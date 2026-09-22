import type { z } from "zod";

/** Flattens a Zod error into one message per top-level field, for inline display. */
export function toFieldErrors<T extends Record<string, unknown>>(
  error: z.ZodError<T>,
): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key as keyof T] = issue.message;
    }
  }
  return result;
}
