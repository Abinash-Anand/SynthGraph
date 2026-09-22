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
