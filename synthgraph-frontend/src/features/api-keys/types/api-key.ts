/** `GET /api-keys` list item. The raw secret is never present here. */
export type ApiKeySummary = {
  id: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
};

/**
 * `POST /api-keys` response. `key` is the raw `sg_<64hex>` secret and is
 * only ever returned this once — the backend stores just a hash after this.
 */
export type ApiKeyCreated = ApiKeySummary & {
  key: string;
};
