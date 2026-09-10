import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { JwtGuard } from './guards/jwt.guard.js';
import { ApiKeyCreationService } from './services/api-key-creation.service.js';
import { ApiKeyService } from './services/api-key.service.js';
import { AuthService } from './services/auth.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeyService,
    ApiKeyCreationService,
    ApiKeyGuard,
    JwtGuard,
  ],
  exports: [
    AuthService,
    ApiKeyService,
    ApiKeyCreationService,
    ApiKeyGuard,
    JwtGuard,
    JwtModule,
  ],
})
export class AuthModule {}