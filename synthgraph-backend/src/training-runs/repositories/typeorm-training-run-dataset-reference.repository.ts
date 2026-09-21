import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { TrainingRunDatasetReference } from '../../database/entities/training-run-dataset-reference.entity.js';
import { TrainingRunDatasetReferenceRepository } from './training-run-dataset-reference.repository.js';

@Injectable()
export class TypeOrmTrainingRunDatasetReferenceRepository
  implements TrainingRunDatasetReferenceRepository
{
  constructor(
    @InjectRepository(TrainingRunDatasetReference)
    private readonly repository: Repository<TrainingRunDatasetReference>,
  ) {}

  async create(
    reference: TrainingRunDatasetReference,
  ): Promise<TrainingRunDatasetReference> {
    return this.repository.save(reference);
  }

  async findForTrainingRun(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRunDatasetReference[]> {
    return this.repository
      .createQueryBuilder('reference')
      .innerJoin('reference.trainingRun', 'trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .leftJoinAndSelect('reference.datasetVersion', 'datasetVersion')
      .where('reference.training_run_id = :trainingRunId', {
        trainingRunId,
      })
      .andWhere('project.userId = :userId', { userId })
      .orderBy('reference.role', 'ASC')
      .getMany();
  }

  async exists(
    trainingRunId: string,
    datasetVersionId: string,
    role: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        trainingRunId,
        datasetVersionId,
        role,
      },
    });

    return count > 0;
  }
}