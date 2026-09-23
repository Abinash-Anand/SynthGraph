import { z } from "zod";

// Mirrors the backend's CreateExperimentDto — identical shape to CreateProjectDto.
export const createExperimentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(255, "Name must be 255 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type CreateExperimentRequest = z.infer<typeof createExperimentSchema>;
export type CreateExperimentFieldErrors = Partial<Record<keyof CreateExperimentRequest, string>>;

// Mirrors the backend's UpdateExperimentDto - identical shape to
// UpdateProjectDto (both fields optional, at least one required).
export const updateExperimentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(255, "Name must be 255 characters or fewer.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be 2000 characters or fewer.")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Change the name or description before saving.",
  });

export type UpdateExperimentRequest = z.infer<typeof updateExperimentSchema>;
export type UpdateExperimentFieldErrors = Partial<Record<keyof UpdateExperimentRequest, string>>;
