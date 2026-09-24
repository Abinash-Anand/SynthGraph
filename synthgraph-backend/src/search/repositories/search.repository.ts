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
  projectName: string | null;
  experimentId: string | null;
  createdAt: string;
};

// A handful of top matches per entity type, not an exhaustive result set -
// this backs a live-typing command palette, not a paginated search page.
const RESULTS_PER_TYPE = 5;

// The recent-entities dropdown (shown on focus, before the user has typed
// enough to trigger a real search) needs more headroom than the palette's
// per-type cap, since it's the only content on screen at that point.
const RECENT_RESULTS_LIMIT = 20;

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
      (SELECT 'project' AS type, p.id, p.name, p.id AS "projectId", p.name AS "projectName", NULL AS "experimentId", p.created_at AS "createdAt"
       FROM projects p
       WHERE p.user_id = $1 AND p.name ILIKE $2
       ORDER BY p.name
       LIMIT $3)
      UNION ALL
      (SELECT 'experiment' AS type, e.id, e.name, e.project_id AS "projectId", p.name AS "projectName", e.id AS "experimentId", e.created_at AS "createdAt"
       FROM experiments e
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1 AND e.name ILIKE $2
       ORDER BY e.name
       LIMIT $3)
      UNION ALL
      (SELECT 'dataset' AS type, d.id, d.name, NULL AS "projectId", NULL AS "projectName", NULL AS "experimentId", d.created_at AS "createdAt"
       FROM datasets d
       WHERE d.user_id = $1 AND d.name ILIKE $2
       ORDER BY d.name
       LIMIT $3)
      UNION ALL
      (SELECT 'asset' AS type, a.id, a.name, NULL AS "projectId", NULL AS "projectName", NULL AS "experimentId", a.created_at AS "createdAt"
       FROM assets a
       WHERE a.user_id = $1 AND a.name ILIKE $2
       ORDER BY a.name
       LIMIT $3)
      UNION ALL
      (SELECT 'generation' AS type, g.id, g.name, e.project_id AS "projectId", p.name AS "projectName", g.experiment_id AS "experimentId", g.created_at AS "createdAt"
       FROM generations g
       INNER JOIN experiments e ON e.id = g.experiment_id
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1 AND g.name ILIKE $2
       ORDER BY g.name
       LIMIT $3)
      UNION ALL
      (SELECT 'trainingRun' AS type, tr.id, tr.name, e.project_id AS "projectId", p.name AS "projectName", tr.experiment_id AS "experimentId", tr.created_at AS "createdAt"
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

  // Backs the compare-picker's "show something before you've typed anything"
  // state - unlike search(), this is single-type (the picker only ever wants
  // one of generation/trainingRun at a time) and orders by recency rather
  // than name, since "recent" is the point.
  async findRecent(
    userId: string,
    type: 'generation' | 'trainingRun',
    limit: number = RECENT_RESULTS_LIMIT,
  ): Promise<SearchResultRow[]> {
    if (type === 'generation') {
      return this.dataSource.query<SearchResultRow[]>(
        `
        SELECT 'generation' AS type, g.id, g.name, e.project_id AS "projectId", p.name AS "projectName", g.experiment_id AS "experimentId", g.created_at AS "createdAt"
        FROM generations g
        INNER JOIN experiments e ON e.id = g.experiment_id
        INNER JOIN projects p ON p.id = e.project_id
        WHERE p.user_id = $1
        ORDER BY g.created_at DESC
        LIMIT $2
        `,
        [userId, limit],
      );
    }

    return this.dataSource.query<SearchResultRow[]>(
      `
      SELECT 'trainingRun' AS type, tr.id, tr.name, e.project_id AS "projectId", p.name AS "projectName", tr.experiment_id AS "experimentId", tr.created_at AS "createdAt"
      FROM training_runs tr
      INNER JOIN experiments e ON e.id = tr.experiment_id
      INNER JOIN projects p ON p.id = e.project_id
      WHERE p.user_id = $1
      ORDER BY tr.created_at DESC
      LIMIT $2
      `,
      [userId, limit],
    );
  }
}
