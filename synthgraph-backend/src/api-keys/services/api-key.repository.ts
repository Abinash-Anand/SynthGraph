import { ApiKey } from "../../database/entities/api-key.entity.js";

export interface ApiKeyRepository {
  create(apiKey: ApiKey): Promise<ApiKey>;
  findByHash(keyHash: string): Promise<ApiKey | null>;
  findByUserId(userId: string): Promise<ApiKey[]>;
  findById(id: string): Promise<ApiKey | null>;
  revoke(id: string, userId: string): Promise<void>;
}