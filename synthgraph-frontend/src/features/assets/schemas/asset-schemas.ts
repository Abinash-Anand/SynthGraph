import { z } from "zod";
import { jsonObjectSchema } from "@/shared/lib/json-field";

// Mirrors the backend's CreateAssetDto.
export const createAssetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(255, "Name must be 255 characters or fewer."),
  type: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  metadata: jsonObjectSchema,
});

export type CreateAssetInput = z.input<typeof createAssetSchema>;
export type CreateAssetRequest = z.infer<typeof createAssetSchema>;
export type CreateAssetFieldErrors = Partial<Record<keyof CreateAssetInput, string>>;

const MAX_SAFE_SIZE = Number.MAX_SAFE_INTEGER;

// Mirrors the backend's CreateAssetVersionDto (no `format` field, unlike datasets).
export const createAssetVersionSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, "Version is required.")
    .max(100, "Version must be 100 characters or fewer."),
  uri: z.string().trim().min(1, "URI is required."),
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

export type CreateAssetVersionInput = z.input<typeof createAssetVersionSchema>;
export type CreateAssetVersionRequest = z.infer<typeof createAssetVersionSchema>;
export type CreateAssetVersionFieldErrors = Partial<Record<keyof CreateAssetVersionInput, string>>;

// Mirrors the backend's UpdateAssetDto: name/description only - `type` is
// deliberately excluded, matching the backend PATCH route's own scope.
export const updateAssetSchema = z
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

export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;
export type UpdateAssetFieldErrors = Partial<Record<keyof UpdateAssetRequest, string>>;
