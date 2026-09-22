import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { EvaluationResult } from '../database/entities/evaluation-result.entity.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';
import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';

import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './repositories/reports.repository.js';
import { GetCaptureCompletenessReportService } from './services/get-capture-completeness-report.service.js';
import { GetEfficiencyLeaderboardService } from './services/get-efficiency-leaderboard.service.js';
import { GetParameterCorrelationReportService } from './services/get-parameter-correlation-report.service.js';

@Module({
  imports: [
    AuthModule,
    // Experiment is registered here too (not just in ExperimentsModule)
    // because TypeOrmExperimentRepository is re-declared as this module's
    // own provider below - forFeature bindings are module-scoped, so each
    // module that instantiates a repository needs its own registration.
    // Mirrors ComparisonsModule re-declaring TypeOrmGenerationRepository.
    TypeOrmModule.forFeature([TrainingRun, EvaluationResult, Experiment]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsRepository,
    TypeOrmExperimentRepository,
    GetCaptureCompletenessReportService,
    GetEfficiencyLeaderboardService,
    GetParameterCorrelationReportService,
  ],
})
export class ReportsModule {}
