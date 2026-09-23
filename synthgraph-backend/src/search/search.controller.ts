import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';

import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchService } from './services/search.service.js';

@Controller('search')
@UseGuards(ApiKeyGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query() query: SearchQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.searchService.execute(request.user.id, query.q);
  }
}
