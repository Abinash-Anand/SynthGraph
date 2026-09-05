import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

@Controller('experiments')
export class ExperimentsController {
  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nPOST /experiments');
    console.log('authorization:', authorization);
    console.dir(body, { depth: null });

    return {
      id: 'experiment_mock_001',
      ...body,
      created_at: new Date().toISOString(),
    };
  }

  @Get()
  list(@Headers('authorization') authorization?: string) {
    console.log('\nGET /experiments');
    console.log('authorization:', authorization);

    return [];
  }

  @Get(':experimentId')
  get(
    @Param('experimentId') experimentId: string,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nGET /experiments/:experimentId');
    console.log('experimentId:', experimentId);
    console.log('authorization:', authorization);

    return {
      id: experimentId,
      name: 'Mock experiment',
      created_at: new Date().toISOString(),
    };
  }
}