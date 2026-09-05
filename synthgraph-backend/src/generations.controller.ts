import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

@Controller()
export class GenerationsController {
  @Post('experiments/:experimentId/generations')
  createGeneration(
    @Param('experimentId') experimentId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\n====================================');
    console.log('POST /experiments/:experimentId/generations');
    console.log('experimentId:', experimentId);
    console.log('authorization:', authorization);
    console.log('body:');
    console.dir(body, { depth: null });
    console.log('====================================\n');

    const now = new Date().toISOString();

    return {
      id: 'generation_mock_001',
      experiment_id: experimentId,

      name: body.name ?? 'Unnamed generation',
      description: body.description ?? null,

      generator: body.generator ?? {
        name: 'unknown',
        version: null,
        type: null,
      },

      parameters: body.parameters ?? {},

      reproducibility: body.reproducibility ?? {},

      inputs: body.inputs ?? [],
      outputs: body.outputs ?? [],

      status: 'pending',

      started_at: null,
      completed_at: null,
      created_at: now,

      metadata: body.metadata ?? {},
    };
  }

  @Get('generations/:generationId')
  getGeneration(
    @Param('generationId') generationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nGET /generations/:generationId');
    console.log('generationId:', generationId);
    console.log('authorization:', authorization);

    return {
      id: generationId,
      experiment_id: 'experiment_mock_001',

      name: 'Mock generation',

      description: null,

      generator: {
        name: 'blender',
        version: '4.2.0',
        type: '3d_renderer',
      },

      parameters: {
        samples: 512,
        weather: 'rain',
      },

      reproducibility: {
        seed: 42,
      },

      inputs: [],
      outputs: [],

      status: 'pending',

      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),

      metadata: {},
    };
  }

  @Get('experiments/:experimentId/generations')
  listGenerations(
    @Param('experimentId') experimentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nGET /experiments/:experimentId/generations');
    console.log('experimentId:', experimentId);
    console.log('authorization:', authorization);

    return [
      {
        id: 'generation_mock_001',
        experiment_id: experimentId,

        name: 'Mock generation',

        description: null,

        generator: {
          name: 'blender',
          version: '4.2.0',
          type: '3d_renderer',
        },

        parameters: {
          weather: 'rain',
        },

        reproducibility: {
          seed: 42,
        },

        inputs: [],
        outputs: [],

        status: 'pending',

        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),

        metadata: {},
      },
    ];
  }

  @Patch('generations/:generationId')
  updateGeneration(
    @Param('generationId') generationId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\n====================================');
    console.log('PATCH /generations/:generationId');
    console.log('generationId:', generationId);
    console.log('authorization:', authorization);
    console.log('body:');
    console.dir(body, { depth: null });
    console.log('====================================\n');

    const status =
      typeof body.status === 'string'
        ? body.status
        : 'pending';

    const now = new Date().toISOString();

    return {
      id: generationId,
      experiment_id: 'experiment_mock_001',

      name: 'Mock generation',

      description: null,

      generator: {
        name: 'blender',
        version: '4.2.0',
        type: '3d_renderer',
      },

      parameters: {},

      reproducibility: {},

      inputs: [],
      outputs: [],

      status,

      started_at: status === 'running' ? now : null,
      completed_at:
        status === 'completed' || status === 'failed'
          ? now
          : null,

      created_at: now,

      metadata: {},
    };
  }
}