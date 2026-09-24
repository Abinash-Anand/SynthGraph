import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class TrainingRunKeysQueryDto {
  @IsIn(['parameters', 'metrics'])
  field: 'parameters' | 'metrics';

  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
