import { Injectable, NotFoundException } from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import { TypeOrmGenerationRepository } from '../repositories/typeorm-generation.repository.js';

@Injectable()
export class GetGenerationService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
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
