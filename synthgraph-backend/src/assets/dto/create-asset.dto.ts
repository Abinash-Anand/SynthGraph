import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
