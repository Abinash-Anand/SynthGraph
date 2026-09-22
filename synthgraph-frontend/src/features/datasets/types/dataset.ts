/**
 * Raw entity, camelCase. Unlike Asset, Dataset has NO `updatedAt` column —
 * it's create-only in the schema (kept verbatim, not normalized to match
 * Asset's shape).
 */
export type Dataset = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DatasetVersion = {
  id: string;
  datasetId: string;
  version: string;
  uri: string;
  format: string | null;
  /** Backend bigint, returned as a string — never coerce to `number`. */
  size: string | null;
  checksum: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
