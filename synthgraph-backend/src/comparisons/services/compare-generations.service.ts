import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import { TypeOrmGenerationRepository } from '../../generations/repositories/typeorm-generation.repository.js';

@Injectable()
export class CompareGenerationsService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
  ) {}

  async execute(
    generationIds: string[],
    userId: string,
  ): Promise<{ generations: Generation[] }> {
    const uniqueGenerationIds = [...new Set(generationIds)];

    if (uniqueGenerationIds.length < 2) {
      throw new BadRequestException(
        'At least two distinct generations are required',
      );
    }

    const generations: Generation[] = [];

    for (const generationId of uniqueGenerationIds) {
      const generation =
        await this.generationRepository.findByIdForUser(
          generationId,
          userId,
        );

      if (!generation) {
        throw new NotFoundException(
          `Generation ${generationId} not found`,
        );
      }

      generations.push(generation);
    }

    return {
      generations,
    };
  }
}