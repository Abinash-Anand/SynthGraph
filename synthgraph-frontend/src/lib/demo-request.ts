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

/**
 * A trimmed, required string with an upper bound.
 *
 * The cap is not cosmetic: every one of these values is anonymous input that
 * gets embedded in an outgoing email, so an uncapped field is a way to make us
 * send a megabyte on someone else's behalf.
 */
const required = (field: string, { min = 2, max = 200 } = {}) =>
  z
    .string()
    .trim()
    .min(min, `${field} is required.`)
    .max(max, `${field} must be ${max} characters or fewer.`);

/** Same bound, for a field nobody has to fill in. */
const optional = (max = 200) => z.string().trim().max(max).optional().or(z.literal(""));

export const demoRequestSchema = z.object({
  // Required
  name: required("Name", { max: 120 }),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required.")
    .max(254, "That email address is too long.")
    .email("Enter a valid email address."),
  institution: required("Institution or company", { max: 160 }),
  role: z.enum(ROLE_OPTIONS, { message: "Select the closest role." }),
  researchArea: required("Research area", { max: 200 }),
  teamSize: z.enum(TEAM_SIZE_OPTIONS, { message: "Select a team size." }),
  workflow: z
    .array(z.enum(WORKFLOW_OPTIONS))
    .min(1, "Select at least one part of your current workflow.")
    .max(WORKFLOW_OPTIONS.length),
  currentTools: required("Current tools", { max: 500 }),
  goal: required("Tell us what you would like to reproduce or track", { min: 10, max: 2000 }),
  message: required("Message", { min: 10, max: 4000 }),

  // Optional
  github: optional(),
  linkedin: optional(),
  datasetScale: z.enum(DATASET_SCALE_OPTIONS).optional().or(z.literal("")),
  generator: optional(),
  trainingFramework: optional(),
  experimentTracking: optional(),

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
