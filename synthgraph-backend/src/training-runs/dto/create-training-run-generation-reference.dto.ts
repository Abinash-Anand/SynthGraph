import { IsUUID } from 'class-validator';

export class CreateTrainingRunGenerationReferenceDto {
  @IsUUID()
  generationId: string;
}
