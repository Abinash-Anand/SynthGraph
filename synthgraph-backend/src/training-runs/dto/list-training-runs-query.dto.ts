import { IsIn, IsOptional } from 'class-validator';

export class ListTrainingRunsQueryDto {
  @IsOptional()
  @IsIn(['complete', 'partial', 'unknown'])
  captureStatus?: 'complete' | 'partial' | 'unknown';
}
