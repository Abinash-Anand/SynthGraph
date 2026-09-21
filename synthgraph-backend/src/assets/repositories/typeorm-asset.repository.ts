import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
      },
    });
  }

  async findAllForUser(userId: string): Promise<Asset[]> {
    return this.repository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
