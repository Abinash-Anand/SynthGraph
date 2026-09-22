import { IsUUID } from 'class-validator';

export class TrainingRunDriftQueryDto {
  @IsUUID('4')
  trainingRunId: string;
}
