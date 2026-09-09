import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { ApiKeyService } from '../auth/services/api-key.service.js';
import { CreateTrainingRunService } from './services/create-training-run.service.js';
import { CreateTrainingRunDatasetReferenceService } from './services/create-training-run-dataset-reference.service.js';
import { GetTrainingRunService } from './services/get-training-run.service.js';
import { TrainingRunsController } from './training-runs.controller.js';

describe('TrainingRunsController', () => {
  let controller: TrainingRunsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingRunsController],
      providers: [
        {
          provide: CreateTrainingRunService,
          useValue: {},
        },
        {
          provide: GetTrainingRunService,
          useValue: {},
        },
        {
          provide: CreateTrainingRunDatasetReferenceService,
          useValue: {},
        },
        {
          provide: ApiKeyService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrainingRunsController>(
      TrainingRunsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});