import { IsUUID } from 'class-validator';

export class ParameterCorrelationQueryDto {
  @IsUUID('4')
  experimentId: string;
}
