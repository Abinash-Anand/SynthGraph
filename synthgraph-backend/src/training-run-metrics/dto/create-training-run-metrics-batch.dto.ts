import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { CreateTrainingRunMetricDto } from './create-training-run-metric.dto.js';

export class CreateTrainingRunMetricsBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CreateTrainingRunMetricDto)
  metrics: CreateTrainingRunMetricDto[];
}
