import {
  IsNotEmpty,
  IsObject,
  IsUUID,
} from 'class-validator';

export class CreateEvaluationResultDto {
  @IsUUID()
  datasetVersionId: string;

  @IsObject()
  metrics: Record<string, unknown>;

  @IsObject()
  metadata: Record<string, unknown> = {};
}