import { GetDocumentationService } from './get-documentation.service.js';

describe('GetDocumentationService', () => {
  const reproductionService = {
    execute: vi.fn(),
  };

  let service: GetDocumentationService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new GetDocumentationService(
      reproductionService as never,
    );
  });

  it('generates structured Markdown documentation from a reproduction manifest', async () => {
    reproductionService.execute.mockResolvedValue({
      schemaVersion: '1.0',
      generation: {
        id: 'generation-1',
        experimentId: 'experiment-1',
        name: 'Rainy Scene Generation',
        description: 'Synthetic rainy driving scenes',
        generator: {
          name: 'blender',
          version: '4.2',
        },
        parameters: {
          lighting: 'rain',
          occlusion: 0.3,
        },
        reproducibility: {
          seed: 42,
          code_version: 'abc123',
        },
        status: 'completed',
        inputs: [
          {
            id: 'input-1',
            uri: 's3://example/input',
          },
        ],
        outputs: [
          {
            id: 'output-1',
            uri: 's3://example/output',
          },
        ],
      },
      datasetReferences: [
        {
          datasetVersionId: 'dataset-version-1',
          role: 'input',
        },
      ],
    });

    const result = await service.execute(
      'generation-1',
      'user-1',
    );

    expect(result).toContain(
      '# Generation: Rainy Scene Generation',
    );

    expect(result).toContain(
      '## Generation',
    );

    expect(result).toContain(
      '- ID: generation-1',
    );

    expect(result).toContain(
      '- Experiment ID: experiment-1',
    );

    expect(result).toContain(
      '- Status: completed',
    );

    expect(result).toContain(
      '## Description',
    );

    expect(result).toContain(
      'Synthetic rainy driving scenes',
    );

    expect(result).toContain(
      '## Generator',
    );

    expect(result).toContain(
      '"name": "blender"',
    );

    expect(result).toContain(
      '## Parameters',
    );

    expect(result).toContain(
      '"lighting": "rain"',
    );

    expect(result).toContain(
      '## Reproducibility',
    );

    expect(result).toContain(
      '"seed": 42',
    );

    expect(result).toContain(
      '## Inputs',
    );

    expect(result).toContain(
      '## Outputs',
    );

    expect(result).toContain(
      '## Dataset References',
    );

    expect(result).toContain(
      '- input: dataset-version-1',
    );

    expect(
      reproductionService.execute,
    ).toHaveBeenCalledWith(
      'generation-1',
      'user-1',
    );
  });

  it('renders None for missing description', async () => {
    reproductionService.execute.mockResolvedValue({
      schemaVersion: '1.0',
      generation: {
        id: 'generation-1',
        experimentId: 'experiment-1',
        name: 'Generation',
        description: null,
        generator: {},
        parameters: {},
        reproducibility: {},
        status: 'completed',
        inputs: [],
        outputs: [],
      },
      datasetReferences: [],
    });

    const result = await service.execute(
      'generation-1',
      'user-1',
    );

    expect(result).toContain(
      '## Description\n\nNone',
    );

    expect(result).toContain(
      '## Dataset References\n\nNone',
    );
  });
});