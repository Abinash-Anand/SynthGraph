import { Injectable } from '@nestjs/common';

import { GetReproductionManifestService } from '../../reproduction/services/get-reproduction-manifest.service.js';

@Injectable()
export class GetDocumentationService {
  constructor(
    private readonly getReproductionManifestService: GetReproductionManifestService,
  ) {}

  async execute(
    generationId: string,
    userId: string,
  ): Promise<string> {
    const manifest =
      await this.getReproductionManifestService.execute(
        generationId,
        userId,
      );

    const generation = manifest.generation;

    const datasetReferences =
      manifest.datasetReferences.length === 0
        ? 'None'
        : manifest.datasetReferences
            .map(
              (reference) =>
                `- ${reference.role}: ${reference.datasetVersionId}`,
            )
            .join('\n');

    return `# Generation: ${generation.name}

## Generation

- ID: ${generation.id}
- Experiment ID: ${generation.experimentId}
- Status: ${generation.status}

## Description

${generation.description ?? 'None'}

## Generator

\`\`\`json
${JSON.stringify(generation.generator, null, 2)}
\`\`\`

## Parameters

\`\`\`json
${JSON.stringify(generation.parameters, null, 2)}
\`\`\`

## Reproducibility

\`\`\`json
${JSON.stringify(generation.reproducibility, null, 2)}
\`\`\`

## Inputs

\`\`\`json
${JSON.stringify(generation.inputs, null, 2)}
\`\`\`

## Outputs

\`\`\`json
${JSON.stringify(generation.outputs, null, 2)}
\`\`\`

## Dataset References

${datasetReferences}
`;
  }
}