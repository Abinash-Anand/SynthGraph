import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGenerationAssetReferenceDto {
  @IsUUID()
  assetVersionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role: string;
}
