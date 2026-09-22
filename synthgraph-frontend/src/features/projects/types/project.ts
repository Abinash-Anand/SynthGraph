/**
 * Returned as a raw TypeORM entity by the backend — camelCase, unlike
 * Generation (see features/generations/types/generation.ts), which goes
 * through a hand-written snake_case response mapper. Kept verbatim rather
 * than silently normalized, so a future backend change is visible here.
 */
export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};
