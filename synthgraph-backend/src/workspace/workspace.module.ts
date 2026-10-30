import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { EvaluationResultsModule } from '../evaluation-results/evaluation-results.module.js';
import { ExperimentsModule } from '../experiments/experiments.module.js';
import { GenerationsModule } from '../generations/generations.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { ReproductionModule } from '../reproduction/reproduction.module.js';
import { TrainingRunMetricsModule } from '../training-run-metrics/training-run-metrics.module.js';
import { TrainingRunsModule } from '../training-runs/training-runs.module.js';
import { GetExperimentWorkspaceService } from './services/get-experiment-workspace.service.js';
import { WorkspaceController } from './workspace.controller.js';

// Composes services other modules already export, so it owns no queries.
@Module({
  imports: [
    AuthModule,
    ExperimentsModule,
    TrainingRunsModule,
    TrainingRunMetricsModule,
    EvaluationResultsModule,
    ReportsModule,
    GenerationsModule,
    ReproductionModule,
  ],
  controllers: [WorkspaceController],
  providers: [GetExperimentWorkspaceService],
})
export class WorkspaceModule {}
