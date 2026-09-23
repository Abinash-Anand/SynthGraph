import { z } from "zod";
import { jsonObjectSchema } from "@/shared/lib/json-field";

// Mirrors the backend's CreateDatasetDto.
export const createDatasetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(255, "Name must be 255 characters or fewer."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  metadata: jsonObjectSchema,
});

/** Pre-transform shape — what the form's raw string inputs hold. */
export type CreateDatasetInput = z.input<typeof createDatasetSchema>;
/** Post-transform shape — what gets sent to the backend. */
export type CreateDatasetRequest = z.infer<typeof createDatasetSchema>;
export type CreateDatasetFieldErrors = Partial<Record<keyof CreateDatasetInput, string>>;

const MAX_SAFE_SIZE = Number.MAX_SAFE_INTEGER;

// Mirrors the backend's CreateDatasetVersionDto.
export const createDatasetVersionSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, "Version is required.")
    .max(100, "Version must be 100 characters or fewer."),
  uri: z.string().trim().min(1, "URI is required."),
  format: z.string().trim().max(100).optional().or(z.literal("")),
  size: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((raw, ctx) => {
      if (!raw) return undefined;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        ctx.addIssue({ code: "custom", message: "Size must be a non-negative whole number." });
        return z.NEVER;
      }
      if (value > MAX_SAFE_SIZE) {
        ctx.addIssue({ code: "custom", message: "Size is too large to enter precisely here." });
        return z.NEVER;
      }
      return value;
    }),
  checksum: z.string().trim().max(255).optional().or(z.literal("")),
  metadata: jsonObjectSchema,
});

export type CreateDatasetVersionInput = z.input<typeof createDatasetVersionSchema>;
export type CreateDatasetVersionRequest = z.infer<typeof createDatasetVersionSchema>;
export type CreateDatasetVersionFieldErrors = Partial<Record<keyof CreateDatasetVersionInput, string>>;

// Mirrors the backend's UpdateDatasetDto: name/description only (no
// metadata - matches the backend PATCH route's scope exactly).
export const updateDatasetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(255, "Name must be 255 characters or fewer.")
      .optional(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Change the name or description before saving.",
  });

export type UpdateDatasetRequest = z.infer<typeof updateDatasetSchema>;
export type UpdateDatasetFieldErrors = Partial<Record<keyof UpdateDatasetRequest, string>>;
