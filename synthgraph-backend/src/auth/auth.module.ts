import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { ApiKeyService } from './services/api-key.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
  ],
  exports: [
    ApiKeyService,
    ApiKeyGuard,
  ],
})
export class AuthModule {}
