import { Injectable, NotFoundException } from '@nestjs/common';

import { TypeOrmGenerationRepository } from '../../generations/repositories/typeorm-generation.repository.js';

@Injectable()
export class ExportGenerationDocumentationService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
  ) {}

  async execute(
    generationId: string,
    userId: string,
  ): Promise<string> {
    const generation =
      await this.generationRepository.findByIdForUser(
        generationId,
        userId,
      );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    return [
      `# Generation: ${generation.name}`,
      '',
      `- ID: ${generation.id}`,
      `- Status: ${generation.status}`,
      '',
      '## Generator',
      '',
      '```json',
      JSON.stringify(generation.generator, null, 2),
      '```',
      '',
      '## Parameters',
      '',
      '```json',
      JSON.stringify(generation.parameters, null, 2),
      '```',
      '',
      '## Reproducibility',
      '',
      '```json',
      JSON.stringify(generation.reproducibility, null, 2),
      '```',
      '',
      '## Inputs',
      '',
      '```json',
      JSON.stringify(generation.inputs, null, 2),
      '```',
      '',
      '## Outputs',
      '',
      '```json',
      JSON.stringify(generation.outputs, null, 2),
      '```',
      '',
      '## Metadata',
      '',
      '```json',
      JSON.stringify(generation.metadata, null, 2),
      '```',
      '',
    ].join('\n');
  }
}