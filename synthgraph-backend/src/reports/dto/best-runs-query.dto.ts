import { IsOptional, IsUUID } from 'class-validator';

export class BestRunsQueryDto {
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
