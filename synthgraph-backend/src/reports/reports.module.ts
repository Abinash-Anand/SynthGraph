import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { DatasetVersion } from '../database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../database/entities/evaluation-result.entity.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { TrainingRunMetric } from '../database/entities/training-run-metric.entity.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';
import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../experiments/repositories/experiment.tokens.js';
import { TypeOrmTrainingRunRepository } from '../training-runs/repositories/typeorm-training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../training-runs/repositories/training-run.tokens.js';

import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './repositories/reports.repository.js';
import { GetBestRunsReportService } from './services/get-best-runs-report.service.js';
import { GetCaptureCompletenessReportService } from './services/get-capture-completeness-report.service.js';
import { GetDatasetImpactReportService } from './services/get-dataset-impact-report.service.js';
import { GetEfficiencyLeaderboardService } from './services/get-efficiency-leaderboard.service.js';
import { GetParameterCorrelationReportService } from './services/get-parameter-correlation-report.service.js';
import { GetTrainingRunDriftService } from './services/get-training-run-drift.service.js';
import { GetTrainingRunHealthService } from './services/get-training-run-health.service.js';
import { GetTrainingRunKeysService } from './services/get-training-run-keys.service.js';
import { SearchTrainingRunsService } from './services/search-training-runs.service.js';

@Module({
  imports: [
    AuthModule,
    // Experiment/TrainingRun are registered here too (not just in their own
    // modules) because their repositories are re-declared as this module's
    // own providers below (behind EXPERIMENT_REPOSITORY/TRAINING_RUN_REPOSITORY,
    // same tokens their own modules provide - not a separate binding) -
    // forFeature bindings are module-scoped, so each module that
    // instantiates a repository needs its own registration. Mirrors
    // ComparisonsModule re-declaring TypeOrmGenerationRepository.
    // DatasetVersion is queried directly by ReportsRepository (not via
    // datasets/'s own factory-provided repository, which isn't wired for
    // plain class injection).
    TypeOrmModule.forFeature([
      TrainingRun,
      EvaluationResult,
      Experiment,
      TrainingRunMetric,
      DatasetVersion,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsRepository,

    {
      provide: EXPERIMENT_REPOSITORY,
      useClass: TypeOrmExperimentRepository,
    },

    {
      provide: TRAINING_RUN_REPOSITORY,
      useClass: TypeOrmTrainingRunRepository,
    },

    GetCaptureCompletenessReportService,
    GetEfficiencyLeaderboardService,
    GetParameterCorrelationReportService,
    GetTrainingRunHealthService,
    SearchTrainingRunsService,
    GetBestRunsReportService,
    GetTrainingRunDriftService,
    GetDatasetImpactReportService,
    GetTrainingRunKeysService,
  ],
})
export class ReportsModule {}
