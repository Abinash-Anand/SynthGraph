import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';
import type { GenerationDatasetReferenceRepository } from './generation-dataset-reference.repository.js';

@Injectable()
export class TypeOrmGenerationDatasetReferenceRepository
  implements GenerationDatasetReferenceRepository
{
  constructor(
    @InjectRepository(GenerationDatasetReference)
    private readonly repository: Repository<GenerationDatasetReference>,
  ) {}

  async create(
    reference: GenerationDatasetReference,
  ): Promise<GenerationDatasetReference> {
    return this.repository.save(reference);
  }

  async findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationDatasetReference[]> {
    return this.repository
      .createQueryBuilder('reference')
      .innerJoin('reference.generation', 'generation')
      .innerJoin('generation.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('reference.generation_id = :generationId', {
        generationId,
      })
      .andWhere('project.user_id = :userId', {
        userId,
      })
      .orderBy('reference.role', 'ASC')
      .getMany();
  }

  async exists(
    generationId: string,
    datasetVersionId: string,
    role: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        generationId,
        datasetVersionId,
        role,
      },
    });

    return count > 0;
  }
}