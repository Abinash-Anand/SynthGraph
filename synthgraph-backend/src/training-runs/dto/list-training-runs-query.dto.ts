import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ListTrainingRunsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['complete', 'partial', 'unknown'])
  captureStatus?: 'complete' | 'partial' | 'unknown';
}
