import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ApiKeyService } from './services/api-key.service.js';
import { ApiKeyCreationService } from './services/api-key-creation.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    ApiKeyService,
    ApiKeyCreationService,
    ApiKeyGuard,
  ],
  exports: [
    ApiKeyService,
    ApiKeyCreationService,
    ApiKeyGuard,
  ],
})
export class AuthModule {}