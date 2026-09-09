import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTrainingRunDatasetReferenceDto {
  @IsUUID()
  datasetVersionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role: string;
}