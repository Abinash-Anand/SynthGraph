import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

// The body is validated by parseMetricDirections / the controller so that every
// problem names the offending metric; these decorators only let the object
// through the global whitelist.
export class DeclareMetricDirectionsDto {
  @IsObject()
  directions: Record<string, unknown>;
}

export class CorrectMetricDirectionDto {
  @IsString()
  metricKey: string;

  @IsString()
  direction: string;

  // Required: a correction changes what a past declaration said, so it has to
  // say why.
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  correctionNote: string;
}
