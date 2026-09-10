import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { ApiKey } from '../database/entities/api-key.entity.js';
import { UsersModule } from '../users/users.module.js';
import { TypeOrmApiKeyRepository } from '../users/repositories/typeorm-api-key.repository.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeyManagementService } from './services/api-key-management.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey]),
    AuthModule,
    UsersModule,
  ],
  controllers: [ApiKeysController],
  providers: [
    ApiKeyManagementService,
    TypeOrmApiKeyRepository,
  ],
})
export class ApiKeysModule {}