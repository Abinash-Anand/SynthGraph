import { IsOptional, IsUUID } from 'class-validator';

export class CaptureCompletenessQueryDto {
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
