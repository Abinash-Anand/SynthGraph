import { Injectable } from '@nestjs/common';

import type { SearchResultRow } from '../repositories/search.repository.js';
import { SearchRepository } from '../repositories/search.repository.js';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async execute(
    userId: string,
    query: string,
  ): Promise<{ results: SearchResultRow[] }> {
    const results = await this.searchRepository.search(userId, query);
    return { results };
  }
}
