import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { ApiKey } from '../../database/entities/api-key.entity.js';
import { TypeOrmApiKeyRepository } from '../../users/repositories/typeorm-api-key.repository.js';

@Injectable()
export class ApiKeyManagementService {
  constructor(
    private readonly apiKeyRepository: TypeOrmApiKeyRepository,
  ) {}

  async create(userId: string) {
    const secret = randomBytes(32).toString('hex');
    const apiKey = `sg_${secret}`;

    const keyPrefix = apiKey.slice(0, 11);

    const keyHash = createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const entity = new ApiKey();

    entity.userId = userId;
    entity.keyPrefix = keyPrefix;
    entity.keyHash = keyHash;
    entity.revokedAt = null;

    await this.apiKeyRepository.create(entity);

    return {
      id: entity.id,
      key: apiKey,
      keyPrefix: entity.keyPrefix,
      createdAt: entity.createdAt,
    };
  }

  async list(userId: string) {
    const apiKeys = await this.apiKeyRepository.findByUserId(userId);

    return apiKeys.map((apiKey) => ({
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      revokedAt: apiKey.revokedAt,
    }));
  }

  async revoke(userId: string, apiKeyId: string) {
    const apiKey = await this.apiKeyRepository.findById(apiKeyId);

    if (!apiKey || apiKey.userId !== userId) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.revokedAt) {
      return;
    }

    await this.apiKeyRepository.revoke(apiKeyId, userId);
  }
}