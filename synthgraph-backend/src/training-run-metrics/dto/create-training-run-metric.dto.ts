import { IsInt, IsObject } from 'class-validator';

export class CreateTrainingRunMetricDto {
  @IsInt()
  step: number;

  @IsObject()
  metrics: Record<string, unknown>;
}
