import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class TrainingRunSearchQueryDto {
  @IsIn(['parameters', 'metrics'])
  field: 'parameters' | 'metrics';

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsIn(['gt', 'gte', 'lt', 'lte', 'eq'])
  op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

  @Type(() => Number)
  @IsNumber()
  value: number;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
