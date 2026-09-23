import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CompareTrainingRunsDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  trainingRunIds: string[];
}
