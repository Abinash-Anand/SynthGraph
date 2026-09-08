import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.js';
import { ApiKeyService } from '../services/api-key.service.js'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      return false;
    }

    const [scheme, credentials] = authorization.split(' ');

    if (scheme !== 'Bearer' || !credentials) {
      return false;
    }

    const user = await this.apiKeyService.verify(credentials);

    request.user = user;

    return true;
  }
}