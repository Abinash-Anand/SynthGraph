import { IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ExperimentAttentionQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  experimentId: string;
}
