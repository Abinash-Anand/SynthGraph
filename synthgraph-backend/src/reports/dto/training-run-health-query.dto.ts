import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class TrainingRunHealthQueryDto {
  @IsUUID('4')
  trainingRunId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  windowSize?: number;
}
