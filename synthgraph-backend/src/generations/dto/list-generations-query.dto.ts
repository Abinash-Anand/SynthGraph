import {
  IsJSON,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class ListGenerationsQueryDto {
  @IsOptional()
  @IsJSON()
  @MaxLength(2000)
  parameters?: string;
}