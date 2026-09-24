import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecentSearchQueryDto {
  @IsIn(['generation', 'trainingRun'])
  type: 'generation' | 'trainingRun';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
