import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Generation,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';
import type { GenerationRepository } from '../repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../repositories/generation.tokens.js';

const validTransitions: Readonly<
  Record<GenerationStatus, readonly GenerationStatus[]>
> = {
  [GenerationStatus.Pending]: [GenerationStatus.Running],
  [GenerationStatus.Running]: [
    GenerationStatus.Completed,
    GenerationStatus.Failed,
  ],
  [GenerationStatus.Completed]: [],
  [GenerationStatus.Failed]: [],
};

@Injectable()
export class UpdateGenerationStatusService {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,
  ) {}

  async execute(
    generationId: string,
    userId: string,
    nextStatus: GenerationStatus,
  ): Promise<Generation> {
    const generation = await this.generationRepository.findByIdForUser(
      generationId,
      userId,
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    if (!validTransitions[generation.status].includes(nextStatus)) {
      throw new ConflictException(
        `Cannot transition generation from ${generation.status} to ${nextStatus}`,
      );
    }

    const now = new Date();
    const startedAt =
      nextStatus === GenerationStatus.Running ? now : generation.startedAt;
    const completedAt =
      nextStatus === GenerationStatus.Completed ||
      nextStatus === GenerationStatus.Failed
        ? now
        : null;

    const updated = await this.generationRepository.transitionStatus(
      generation.id,
      generation.status,
      nextStatus,
      startedAt,
      completedAt,
    );

    if (!updated) {
      throw new ConflictException('Generation status changed; retry request');
    }

    const result = await this.generationRepository.findByIdForUser(
      generation.id,
      userId,
    );

    if (!result) {
      throw new NotFoundException('Generation not found');
    }

    return result;
  }
}
