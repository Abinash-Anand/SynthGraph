import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type SearchResultType =
  | 'project'
  | 'experiment'
  | 'dataset'
  | 'asset'
  | 'generation'
  | 'trainingRun';

export type SearchResultRow = {
  type: SearchResultType;
  id: string;
  name: string;
  projectId: string | null;
  experimentId: string | null;
};

// A handful of top matches per entity type, not an exhaustive result set -
// this backs a live-typing command palette, not a paginated search page.
const RESULTS_PER_TYPE = 5;

// Six tables, three different join depths (direct user_id, one hop through
// experiments, two hops through experiments+projects) - a single UNION ALL
// query is the right tool here, same "raw SQL outside QueryBuilder's reach"
// precedent as ReportsRepository.getIntegrationBreakdown. Each branch is
// capped independently so one prolific entity type can't crowd out the
// others in the combined result.
@Injectable()
export class SearchRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async search(userId: string, query: string): Promise<SearchResultRow[]> {
    const pattern = `%${query}%`;

    return this.dataSource.query<SearchResultRow[]>(
      `
      (SELECT 'project' AS type, p.id, p.name, p.id AS "projectId", NULL AS "experimentId"
       FROM projects p
       WHERE p.user_id = $1 AND p.name ILIKE $2
       ORDER BY p.name
       LIMIT $3)
      UNION ALL
      (SELECT 'experiment' AS type, e.id, e.name, e.project_id AS "projectId", e.id AS "experimentId"
       FROM experiments e
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1 AND e.name ILIKE $2
       ORDER BY e.name
       LIMIT $3)
      UNION ALL
      (SELECT 'dataset' AS type, d.id, d.name, NULL AS "projectId", NULL AS "experimentId"
       FROM datasets d
       WHERE d.user_id = $1 AND d.name ILIKE $2
       ORDER BY d.name
       LIMIT $3)
      UNION ALL
      (SELECT 'asset' AS type, a.id, a.name, NULL AS "projectId", NULL AS "experimentId"
       FROM assets a
       WHERE a.user_id = $1 AND a.name ILIKE $2
       ORDER BY a.name
       LIMIT $3)
      UNION ALL
      (SELECT 'generation' AS type, g.id, g.name, e.project_id AS "projectId", g.experiment_id AS "experimentId"
       FROM generations g
       INNER JOIN experiments e ON e.id = g.experiment_id
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1 AND g.name ILIKE $2
       ORDER BY g.name
       LIMIT $3)
      UNION ALL
      (SELECT 'trainingRun' AS type, tr.id, tr.name, e.project_id AS "projectId", tr.experiment_id AS "experimentId"
       FROM training_runs tr
       INNER JOIN experiments e ON e.id = tr.experiment_id
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1 AND tr.name ILIKE $2
       ORDER BY tr.name
       LIMIT $3)
      `,
      [userId, pattern, RESULTS_PER_TYPE],
    );
  }
}
