import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

@Controller('projects')
export class ProjectsController {
  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nPOST /projects');
    console.log('authorization:', authorization);
    console.dir(body, { depth: null });

    return {
      id: 'project_mock_001',
      ...body,
      created_at: new Date().toISOString(),
    };
  }

  @Get()
  list(@Headers('authorization') authorization?: string) {
    console.log('\nGET /projects');
    console.log('authorization:', authorization);

    return [];
  }

  @Get(':projectId')
  get(
    @Param('projectId') projectId: string,
    @Headers('authorization') authorization?: string,
  ) {
    console.log('\nGET /projects/:projectId');
    console.log('projectId:', projectId);
    console.log('authorization:', authorization);

    return {
      id: projectId,
      name: 'Mock project',
      created_at: new Date().toISOString(),
    };
  }
}