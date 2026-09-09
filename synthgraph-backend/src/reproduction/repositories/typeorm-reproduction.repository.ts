import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

import { ReproductionRepository } from './reproduction.repository.js';

@Injectable()
export class TypeOrmReproductionRepository
  implements ReproductionRepository
{
  constructor(
    @InjectRepository(GenerationDatasetReference)
    private readonly datasetReferenceRepository: Repository<GenerationDatasetReference>,
  ) {}

  async findDatasetReferences(
    generationId: string,
  ): Promise<GenerationDatasetReference[]> {
    return this.datasetReferenceRepository.find({
      where: {
        generationId,
      },
      order: {
        role: 'ASC',
      },
    });
  }
}