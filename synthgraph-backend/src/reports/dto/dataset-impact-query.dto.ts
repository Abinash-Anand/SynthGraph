import { IsUUID } from 'class-validator';

export class DatasetImpactQueryDto {
  @IsUUID('4')
  datasetVersionId: string;
}
