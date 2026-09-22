import { z } from "zod";

// Mirrors the backend's UpdateTrainingRunStatusDto: @IsIn(['running','completed','failed']).
export const updateStatusSchema = z.object({
  status: z.enum(["running", "completed", "failed"]),
});

// Mirrors the backend's UpdateTrainingRunCaptureStatusDto.
export const updateCaptureStatusSchema = z.object({
  status: z.enum(["complete", "partial", "unknown"]),
  integrations: z.record(z.string(), z.object({ attached: z.boolean(), closed: z.boolean() })),
});
