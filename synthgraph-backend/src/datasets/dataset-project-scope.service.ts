import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export const CROSS_PROJECT_REFERENCE = 'cross_project_reference';

type ScopeRow = { dataset_id: string; project_id: string | null };

/**
 * A dataset is used within one project (ARCH-004). Reusing it from another
 * experiment of the same project is allowed; from another project is not.
 *
 * Datasets created before this rule have no project. What already references one
 * decides what happens to a new reference to it:
 *   - nothing yet, or only this project: it is scoped to this project;
 *   - only one other project: it is that project's dataset, so the reference is
 *     rejected (it is not scoped by a failed request);
 *   - two or more projects: it cannot be attributed to one, so it stays unscoped
 *     and the reference is accepted.
 * Nothing here reads a name or a timestamp, and no existing reference is changed
 * or revalidated.
 */
@Injectable()
export class DatasetProjectScopeService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Call before recording a reference from a generation, run or evaluation that
   * belongs to `experimentId`. Throws 409 `cross_project_reference` when the
   * dataset belongs to another project; otherwise returns, scoping the dataset
   * to this project when it had none.
   */
  async enforceForExperiment(
    datasetVersionId: string,
    experimentId: string,
  ): Promise<void> {
    const projectId = await this.projectOf(experimentId);
    if (projectId === null) return;

    const scope = await this.scopeOf(datasetVersionId);
    if (scope === null) return;

    if (scope.project_id !== null) {
      this.assertSame(scope, projectId);
      return;
    }

    const existing = await this.projectsReferencing(scope.dataset_id);
    if (existing.length >= 2) return;
    if (existing.length === 1 && existing[0] !== projectId) {
      this.assertSame({ ...scope, project_id: existing[0] }, projectId);
    }

    // Atomic: of two simultaneous first references from different projects,
    // exactly one wins and the other re-reads the winner's project below.
    const claimed: Array<{ id: string }> = await this.dataSource.query(
      `UPDATE datasets SET project_id = $1 WHERE id = $2 AND project_id IS NULL RETURNING id`,
      [projectId, scope.dataset_id],
    );
    if (claimed.length === 0) {
      const current = await this.scopeOf(datasetVersionId);
      if (current !== null) this.assertSame(current, projectId);
    }
  }

  private assertSame(scope: ScopeRow, projectId: string): void {
    if (scope.project_id === projectId) return;
    throw new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      code: CROSS_PROJECT_REFERENCE,
      message:
        'This dataset belongs to a different project. A dataset can only be used within one project.',
      datasetId: scope.dataset_id,
    });
  }

  private async projectOf(experimentId: string): Promise<string | null> {
    const rows: Array<{ project_id: string }> = await this.dataSource.query(
      `SELECT project_id FROM experiments WHERE id = $1`,
      [experimentId],
    );
    return rows[0]?.project_id ?? null;
  }

  private async scopeOf(datasetVersionId: string): Promise<ScopeRow | null> {
    const rows: ScopeRow[] = await this.dataSource.query(
      `SELECT d.id AS dataset_id, d.project_id
         FROM dataset_versions v
         JOIN datasets d ON d.id = v.dataset_id
        WHERE v.id = $1`,
      [datasetVersionId],
    );
    return rows[0] ?? null;
  }

  /** The distinct projects that already reference any version of the dataset (at most two are returned). */
  private async projectsReferencing(datasetId: string): Promise<string[]> {
    const rows: Array<{ project_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT x.project_id FROM (
         SELECT e.project_id
           FROM generation_dataset_refs r
           JOIN dataset_versions v ON v.id = r.dataset_version_id
           JOIN generations g ON g.id = r.generation_id
           JOIN experiments e ON e.id = g.experiment_id
          WHERE v.dataset_id = $1
         UNION
         SELECT e.project_id
           FROM training_run_dataset_refs r
           JOIN dataset_versions v ON v.id = r.dataset_version_id
           JOIN training_runs t ON t.id = r.training_run_id
           JOIN experiments e ON e.id = t.experiment_id
          WHERE v.dataset_id = $1
         UNION
         SELECT e.project_id
           FROM evaluation_results er
           JOIN dataset_versions v ON v.id = er.dataset_version_id
           JOIN training_runs t ON t.id = er.training_run_id
           JOIN experiments e ON e.id = t.experiment_id
          WHERE v.dataset_id = $1
       ) x
       LIMIT 2`,
      [datasetId],
    );
    return rows.map((row) => row.project_id);
  }
}
