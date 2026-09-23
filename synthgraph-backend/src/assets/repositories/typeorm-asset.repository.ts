import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Asset } from '../../database/entities/asset.entity.js';
import type { AssetRepository } from './asset.repository.js';

@Injectable()
export class TypeOrmAssetRepository implements AssetRepository {
  constructor(
    @InjectRepository(Asset)
    private readonly repository: Repository<Asset>,
  ) {}

  async create(asset: Asset): Promise<Asset> {
    return this.repository.save(asset);
  }

  async findByIdForUser(
    assetId: string,
    userId: string,
  ): Promise<Asset | null> {
    return this.repository.findOne({
      where: {
        id: assetId,
        userId,
        archivedAt: IsNull(),
      },
    });
  }

  async findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Asset[]> {
    return this.repository.find({
      where: {
        userId,
        archivedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
  }

  async update(
    assetId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id: assetId, userId, archivedAt: IsNull() },
      changes,
    );

    return result.affected === 1;
  }

  async archive(assetId: string, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id: assetId, userId, archivedAt: IsNull() },
      { archivedAt: new Date() },
    );

    return result.affected === 1;
  }
}
