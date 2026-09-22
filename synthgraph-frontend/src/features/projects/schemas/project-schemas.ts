import { z } from "zod";

// Mirrors the backend's CreateProjectDto: name required (@IsString @IsNotEmpty
// @MaxLength(255)), description optional (@IsOptional @IsString).
export const createProjectSchema = z.object({
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

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type CreateProjectFieldErrors = Partial<Record<keyof CreateProjectRequest, string>>;
