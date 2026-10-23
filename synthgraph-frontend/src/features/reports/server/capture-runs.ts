import "server-only";
import { listExperiments } from "@/features/experiments/server/experiments-api";
import { listProjects } from "@/features/projects/server/projects-api";
import { listTrainingRunsForExperiment } from "@/features/training-runs/server/training-runs-api";
import type { TrainingRun } from "@/features/training-runs/types/training-run";
import type { CaptureStatusFilter } from "../capture-model";

export type CaptureRun = {
  run: TrainingRun;
  projectId: string;
  projectName: string;
  experimentId: string;
  experimentName: string;
};

// A drill-down list, not an export: this is for "which runs do I need to
// look at", so it stops well short of listing an account's whole history.
const MAX_RUNS = 100;

/**
 * The runs behind the report's counts. The report itself only has totals, so
 * this walks project -> experiment -> runs, using the per-experiment
 * `captureStatus` filter so only the runs asked about are fetched at all.
 * Every hop is batched with Promise.all (the codebase's N+1 convention), and
 * a single experiment failing to load drops its runs rather than the page.
 */
export async function listRunsByCaptureStatus(
  apiKey: string,
  statuses: CaptureStatusFilter[],
  projectId?: string,
): Promise<{ runs: CaptureRun[]; truncated: boolean }> {
  const allProjects = await listProjects(apiKey);
  const projects = projectId ? allProjects.filter((project) => project.id === projectId) : allProjects;

  const experimentsByProject = await Promise.all(
    projects.map(async (project) => ({
      project,
      experiments: await listExperiments(apiKey, project.id).catch(() => []),
    })),
  );

  const found = await Promise.all(
    experimentsByProject.flatMap(({ project, experiments }) =>
      experiments.flatMap((experiment) =>
        statuses.map(async (status) => {
          const runs = await listTrainingRunsForExperiment(apiKey, experiment.id, status).catch(() => []);
          return runs.map(
            (run): CaptureRun => ({
              run,
              projectId: project.id,
              projectName: project.name,
              experimentId: experiment.id,
              experimentName: experiment.name,
            }),
          );
        }),
      ),
    ),
  );

  // The same run can't match two statuses, but guard anyway: a duplicate row
  // would be confusing and costs nothing to avoid.
  const unique = new Map<string, CaptureRun>();
  for (const item of found.flat()) unique.set(item.run.id, item);
  const sorted = Array.from(unique.values()).sort((a, b) => b.run.createdAt.localeCompare(a.run.createdAt));
  return { runs: sorted.slice(0, MAX_RUNS), truncated: sorted.length > MAX_RUNS };
}
