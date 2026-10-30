import { IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class ExperimentTrainingRunDriftQueryDto extends PaginationQueryDto {
  @IsUUID('4')
  experimentId: string;
}
