import type { Generation } from "@/features/generations/types/generation";

/** The backend does no diffing — it just returns the full entities. */
export type GenerationComparison = {
  generations: Generation[];
};
