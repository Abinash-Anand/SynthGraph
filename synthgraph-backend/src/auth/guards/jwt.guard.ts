import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypeOrmUserRepository } from '../../users/repositories/typeorm-user.repository.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: TypeOrmUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authentication required');
    }

    const [scheme, credentials] = authorization.split(' ');

    if (scheme !== 'Bearer' || !credentials) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(credentials);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = user;

    return true;
  }
}