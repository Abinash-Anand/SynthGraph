import { ApiKey } from "../../database/entities/api-key.entity.js";

export interface ApiKeyRepository {
  create(apiKey: ApiKey): Promise<ApiKey>;
  findByHash(keyHash: string): Promise<ApiKey | null>;
}