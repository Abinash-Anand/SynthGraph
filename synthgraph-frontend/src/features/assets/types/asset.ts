/**
 * Raw entity, camelCase. Unlike Dataset, Asset HAS `updatedAt` (kept
 * verbatim — the two entities' schemas genuinely differ here).
 */
export type Asset = {
  id: string;
  userId: string;
  name: string;
  type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/** Unlike DatasetVersion, AssetVersion has NO `format` field. */
export type AssetVersion = {
  id: string;
  assetId: string;
  version: string;
  uri: string;
  size: string | null;
  checksum: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
