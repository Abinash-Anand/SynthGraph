import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ipTracker } from '../common/throttling/throttle-trackers.js';

import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { JwtGuard } from './guards/jwt.guard.js';
import { AuthService } from './services/auth.service.js';
import type { AuthenticatedRequest } from './types/authenticated-request.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter than the global default (ThrottlerModule.forRoot in app.module.ts)
  // - these are the account-creation/credential-guessing surface, not
  // ordinary API traffic. Counted per IP, not per bearer credential: a
  // guesser could otherwise dodge the limit by sending a new fake credential
  // each time.
  @Throttle({ default: { limit: 10, ttl: 60_000, getTracker: ipTracker } })
  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000, getTracker: ipTracker } })
  @Post('login')
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user.id,
      email: request.user.email,
    };
  }

  @Get('me/api-key')
  @UseGuards(ApiKeyGuard)
  getCurrentUserByApiKey(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user.id,
      email: request.user.email,
    };
  }
}