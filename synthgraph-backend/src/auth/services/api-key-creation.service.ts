import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';

import { ApiKey } from '../../database/entities/api-key.entity.js';
import { TypeOrmApiKeyRepository } from '../../users/repositories/typeorm-api-key.repository.js';
import { TypeOrmUserRepository } from '../../users/repositories/typeorm-user.repository.js';

@Injectable()
export class ApiKeyCreationService {
  constructor(
    private readonly apiKeyRepository: TypeOrmApiKeyRepository,
    private readonly userRepository: TypeOrmUserRepository,
  ) {}

  async create(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const secret = randomBytes(32).toString('hex');
    const apiKey = `sg_${secret}`;

    const keyPrefix = apiKey.slice(0, 11);

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const entity = new ApiKey();

    entity.userId = user.id;
    entity.keyPrefix = keyPrefix;
    entity.keyHash = keyHash;
    entity.revokedAt = null;

    await this.apiKeyRepository.create(entity);

    return apiKey;
  }
}
