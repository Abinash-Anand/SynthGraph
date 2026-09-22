import { z } from "zod";

/**
 * An optional JSON-object textarea input, parsed and validated at the edge
 * of the form. Empty input becomes `undefined` (field omitted from the
 * request body); non-empty input must parse to a plain object (not an
 * array, not a primitive) or the field reports an inline error.
 */
export const jsonObjectSchema = z
  .string()
  .trim()
  .optional()
  .transform((raw, ctx): Record<string, unknown> | undefined => {
    if (!raw) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.addIssue({ code: "custom", message: "Must be valid JSON." });
      return z.NEVER;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      ctx.addIssue({ code: "custom", message: "Must be a JSON object, e.g. {\"key\": \"value\"}." });
      return z.NEVER;
    }
    return parsed as Record<string, unknown>;
  });
