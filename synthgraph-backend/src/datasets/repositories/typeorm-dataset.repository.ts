import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Dataset } from '../../database/entities/dataset.entity.js';
import type { DatasetRepository } from './dataset.repository.js';

@Injectable()
export class TypeOrmDatasetRepository implements DatasetRepository {
  constructor(
    @InjectRepository(Dataset)
    private readonly repository: Repository<Dataset>,
  ) {}

  async create(dataset: Dataset): Promise<Dataset> {
    return this.repository.save(dataset);
  }

  async findByIdForUser(
    datasetId: string,
    userId: string,
  ): Promise<Dataset | null> {
    return this.repository.findOne({
      where: {
        id: datasetId,
        userId,
      },
    });
  }

  async findAllForUser(userId: string): Promise<Dataset[]> {
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