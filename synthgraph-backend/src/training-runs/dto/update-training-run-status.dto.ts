import { IsIn } from 'class-validator';

export class UpdateTrainingRunStatusDto {
  @IsIn(['running', 'completed', 'failed'])
  status: 'running' | 'completed' | 'failed';
}
