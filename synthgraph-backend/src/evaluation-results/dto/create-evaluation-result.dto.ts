import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// The column is a 32-bit integer, like training_run_metrics.step.
export const MAX_CHECKPOINT_STEP = 2_147_483_647;

export class CreateEvaluationResultDto {
  @IsUUID()
  datasetVersionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /**
   * The training step this evaluation was taken at. Optional: when omitted the
   * evaluation has no checkpoint step (it is not read from the name).
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CHECKPOINT_STEP)
  checkpointStep?: number | null;

  @IsObject()
  metrics: Record<string, unknown>;

  @IsObject()
  metadata: Record<string, unknown> = {};
}