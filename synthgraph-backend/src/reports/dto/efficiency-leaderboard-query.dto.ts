import { IsOptional, IsUUID } from 'class-validator';

export class EfficiencyLeaderboardQueryDto {
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
