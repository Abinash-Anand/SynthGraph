/** Raw TypeORM entity shape — camelCase (see the note in features/projects/types/project.ts). */
export type Experiment = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};
