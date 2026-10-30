import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { ExperimentMetricDirection } from '../database/entities/experiment-metric-direction.entity.js';
import { ExperimentsModule } from '../experiments/experiments.module.js';
import { MetricDirectionsController } from './metric-directions.controller.js';
import { MetricDirectionsService } from './metric-directions.service.js';

@Module({
  imports: [
    AuthModule,
    // Brings EXPERIMENT_REPOSITORY for the ownership check.
    ExperimentsModule,
    TypeOrmModule.forFeature([ExperimentMetricDirection]),
  ],
  controllers: [MetricDirectionsController],
  providers: [MetricDirectionsService],
  exports: [MetricDirectionsService],
})
export class MetricDirectionsModule {}
