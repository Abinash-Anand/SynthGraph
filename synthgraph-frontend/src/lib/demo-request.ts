import { z } from "zod";

export const ROLE_OPTIONS = [
  "PhD Researcher",
  "Postdoctoral Researcher",
  "Research Engineer",
  "Professor / PI",
  "Research Lab",
  "Startup",
  "Industry R&D",
  "Other",
] as const;

export const WORKFLOW_OPTIONS = [
  "Blender",
  "Unity",
  "NVIDIA Omniverse",
  "Custom simulator",
  "Custom Python",
  "Other",
] as const;

export const TEAM_SIZE_OPTIONS = ["Just me", "2–5", "6–15", "16–50", "50+"] as const;

export const DATASET_SCALE_OPTIONS = [
  "Under 10 GB",
  "10–100 GB",
  "100 GB – 1 TB",
  "Over 1 TB",
] as const;

const required = (field: string, min = 2) =>
  z.string().trim().min(min, `${field} is required.`);

export const demoRequestSchema = z.object({
  // Required
  name: required("Name"),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required.")
    .email("Enter a valid email address."),
  institution: required("Institution or company"),
  role: z.enum(ROLE_OPTIONS, { message: "Select the closest role." }),
  researchArea: required("Research area"),
  teamSize: z.enum(TEAM_SIZE_OPTIONS, { message: "Select a team size." }),
  workflow: z
    .array(z.enum(WORKFLOW_OPTIONS))
    .min(1, "Select at least one part of your current workflow."),
  currentTools: required("Current tools"),
  goal: required("Tell us what you would like to reproduce or track", 10),
  message: required("Message", 10),

  // Optional
  github: z.string().trim().max(200).optional().or(z.literal("")),
  linkedin: z.string().trim().max(200).optional().or(z.literal("")),
  datasetScale: z.enum(DATASET_SCALE_OPTIONS).optional().or(z.literal("")),
  generator: z.string().trim().max(200).optional().or(z.literal("")),
  trainingFramework: z.string().trim().max(200).optional().or(z.literal("")),
  experimentTracking: z.string().trim().max(200).optional().or(z.literal("")),

  /** Populated by bots, ignored by people. Never shown to a screen reader. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;

export type DemoFieldErrors = Partial<Record<keyof DemoRequest, string>>;

export const EMPTY_DEMO_REQUEST: DemoRequest = {
  name: "",
  email: "",
  institution: "",
  role: "PhD Researcher",
  researchArea: "",
  teamSize: "Just me",
  workflow: [],
  currentTools: "",
  goal: "",
  message: "",
  github: "",
  linkedin: "",
  datasetScale: "",
  generator: "",
  trainingFramework: "",
  experimentTracking: "",
  website: "",
};

/** Flattens a Zod error into one message per field, for inline display. */
export function toFieldErrors(error: z.ZodError<DemoRequest>): DemoFieldErrors {
  const result: DemoFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key as keyof DemoRequest] = issue.message;
    }
  }
  return result;
}
