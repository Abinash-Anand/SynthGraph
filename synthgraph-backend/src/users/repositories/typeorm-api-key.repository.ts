import { ApiKey } from '../../database/entities/api-key.entity.js';
import { ApiKeyRepository } from './api-key.repository.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm'
@Injectable()
export class TypeOrmApiKeyRepository implements ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repository: Repository<ApiKey>,
  ) {}

  async create(apiKey: ApiKey): Promise<ApiKey> {
    return this.repository.save(apiKey);
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: {
        keyHash,
        revokedAt: IsNull(),
      },
      relations: {
        user: true,
      },
    });
  }
}