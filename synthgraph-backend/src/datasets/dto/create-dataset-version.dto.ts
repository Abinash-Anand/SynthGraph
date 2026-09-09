import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDatasetVersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  version: string;

  @IsString()
  @IsNotEmpty()
  uri: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  format?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}