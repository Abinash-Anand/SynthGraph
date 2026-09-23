import {
  IsJSON,
  IsOptional,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ListGenerationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsJSON()
  @MaxLength(2000)
  parameters?: string;
}