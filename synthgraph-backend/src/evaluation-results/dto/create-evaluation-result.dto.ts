import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEvaluationResultDto {
  @IsUUID()
  datasetVersionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsObject()
  metrics: Record<string, unknown>;

  @IsObject()
  metadata: Record<string, unknown> = {};
}