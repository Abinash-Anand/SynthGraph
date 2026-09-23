import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Shared by every list route that had no cap at all (see the fleet-wide
// pagination hardening pass). Additive and backward compatible on purpose:
// both fields default when omitted, so existing callers that never pass
// limit/offset keep working exactly as before, just capped instead of
// truly unbounded.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 100;
}
