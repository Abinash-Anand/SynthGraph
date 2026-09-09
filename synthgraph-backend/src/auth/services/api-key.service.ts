import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { TypeOrmApiKeyRepository } from '../../users/repositories/typeorm-api-key.repository.js';
import { User } from '../../database/entities/user.entity.js';

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepository: TypeOrmApiKeyRepository) {}

  async verify(apiKey: string): Promise<User> {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const storedApiKey = await this.apiKeyRepository.findByHash(keyHash);

    if (!storedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return storedApiKey.user;
  }
}
