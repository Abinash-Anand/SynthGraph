import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/guards/jwt.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { ApiKeyManagementService } from './services/api-key-management.service.js';

@Controller('api-keys')
@UseGuards(JwtGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeyManagementService: ApiKeyManagementService,
  ) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) {
    return this.apiKeyManagementService.create(request.user.id);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.apiKeyManagementService.list(request.user.id);
  }

  @Delete(':apiKeyId')
  async revoke(
    @Req() request: AuthenticatedRequest,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    await this.apiKeyManagementService.revoke(
      request.user.id,
      apiKeyId,
    );

    return {
      message: 'API key revoked',
    };
  }
}