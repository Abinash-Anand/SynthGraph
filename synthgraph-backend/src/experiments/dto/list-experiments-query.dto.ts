import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListExperimentsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}