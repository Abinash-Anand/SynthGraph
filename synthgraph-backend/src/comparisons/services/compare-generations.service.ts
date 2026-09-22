import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import { TypeOrmGenerationRepository } from '../../generations/repositories/typeorm-generation.repository.js';

export type GenerationDifference = {
  field: string;
  values: Record<string, unknown>;
};

@Injectable()
export class CompareGenerationsService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
  ) {}

  async execute(
    generationIds: string[],
    userId: string,
  ): Promise<{
    generations: Generation[];
    differences: GenerationDifference[];
  }> {
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
      differences: buildDifferences(generations),
    };
  }
}

// Additive only - the existing `generations` field is untouched (the CLI's
// `synthgraph compare` command already consumes it and must not break).
// Computes the same deep-equal comparison the frontend previously did
// client-side, just once, server-side, for every consumer.
function buildDifferences(generations: Generation[]): GenerationDifference[] {
  const differences: GenerationDifference[] = [];

  const addIfDiffers = (field: string, getValue: (g: Generation) => unknown) => {
    const values: Record<string, unknown> = {};
    for (const generation of generations) {
      values[generation.id] = getValue(generation);
    }
    const serialized = Object.values(values).map((value) => JSON.stringify(value));
    const allEqual = serialized.every((value) => value === serialized[0]);
    if (!allEqual) {
      differences.push({ field, values });
    }
  };

  addIfDiffers('status', (g) => g.status);
  addIfDiffers('generator', (g) => g.generator);
  addIfDiffers('startedAt', (g) => g.startedAt);
  addIfDiffers('completedAt', (g) => g.completedAt);

  const parameterKeys = new Set<string>();
  for (const generation of generations) {
    for (const key of Object.keys(generation.parameters ?? {})) {
      parameterKeys.add(key);
    }
  }
  for (const key of parameterKeys) {
    addIfDiffers(`parameters.${key}`, (g) => (g.parameters ?? {})[key]);
  }

  return differences;
}