import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ApiKey } from '../../database/entities/api-key.entity.js';
import { ApiKeyRepository } from './api-key.repository.js';

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

  async findByUserId(userId: string): Promise<ApiKey[]> {
    return this.repository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findById(id: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async revoke(id: string, userId: string): Promise<void> {
    await this.repository.update(
      {
        id,
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );
  }
}