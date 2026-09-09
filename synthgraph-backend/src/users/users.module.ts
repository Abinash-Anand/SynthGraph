import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiKey } from '../database/entities/api-key.entity.js';
import { User } from '../database/entities/user.entity.js';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository.js';
import { TypeOrmApiKeyRepository } from './repositories/typeorm-api-key.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, ApiKey])],
  providers: [TypeOrmUserRepository, TypeOrmApiKeyRepository],
  exports: [TypeOrmUserRepository, TypeOrmApiKeyRepository],
})
export class UsersModule {}
