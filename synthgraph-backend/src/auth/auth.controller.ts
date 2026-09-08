import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from './guards/api-key.guard.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(ApiKeyGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user.id,
      email: request.user.email,
    };
  }
}
