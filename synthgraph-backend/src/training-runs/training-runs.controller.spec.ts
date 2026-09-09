import { Test, TestingModule } from '@nestjs/testing';
import { TrainingRunsController } from './training-runs.controller.js';

describe('TrainingRunsController', () => {
  let controller: TrainingRunsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingRunsController],
    }).compile();

    controller = module.get<TrainingRunsController>(TrainingRunsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
