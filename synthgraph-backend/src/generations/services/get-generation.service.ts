import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import type { GenerationRepository } from '../repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../repositories/generation.tokens.js';

@Injectable()
export class GetGenerationService {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,
  ) {}

  async execute(generationId: string, userId: string): Promise<Generation> {
    const generation = await this.generationRepository.findByIdForUser(
      generationId,
      userId,
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    return generation;
  }
}
