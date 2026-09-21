import { IsIn, IsObject } from 'class-validator';

export class UpdateTrainingRunCaptureStatusDto {
  @IsIn(['complete', 'partial', 'unknown'])
  status: 'complete' | 'partial' | 'unknown';

  @IsObject()
  integrations: Record<
    string,
    {
      attached: boolean;
      closed: boolean;
    }
  >;
}
