import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const CAPTURE_STATUSES = ['complete', 'partial', 'unknown'] as const;
export type CaptureStatusBucket = (typeof CAPTURE_STATUSES)[number];

export class CaptureCompletenessRunsQueryDto {
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  /**
   * One status to list. Omitted means the runs that need attention: partial and
   * unknown (a run that never reported counts as unknown, as in the report).
   */
  @IsOptional()
  @IsIn(CAPTURE_STATUSES)
  status?: CaptureStatusBucket;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 100;
}
