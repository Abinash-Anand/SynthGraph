import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ExperimentTrainingRunHealthQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  experimentId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  windowSize?: number;
}
