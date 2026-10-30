import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsModule } from './assets/assets.module.js';
import { AuthModule } from './auth/auth.module.js';
import { bearerTracker, ipTracker } from './common/throttling/throttle-trackers.js';
import { ComparisonsModule } from './comparisons/comparisons.module.js';
import configuration from './config/configuration.js';
import { DatasetsModule } from './datasets/datasets.module.js';
import { DocumentationModule } from './documentation/documentation.module.js';
import { EvaluationResultsModule } from './evaluation-results/evaluation-results.module.js';
import { ExperimentsModule } from './experiments/experiments.module.js';
import { GenerationsModule } from './generations/generations.module.js';
import { HealthController } from './health.controller.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ReproductionModule } from './reproduction/reproduction.module.js';
import { SearchModule } from './search/search.module.js';
import { TrainingRunsModule } from './training-runs/training-runs.module.js';
import { TrainingRunMetricsModule } from './training-run-metrics/training-run-metrics.module.js';
import { WorkspaceModule } from './workspace/workspace.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // In-memory (single-instance) rate limiting, two layers:
    // - `default` counts per caller (bearer credential, else IP) - the dashboard
    //   reaches this API from one frontend server, so an IP bucket alone made
    //   every user share one 120/min allowance. AuthController overrides it
    //   per-route (tighter limit, pinned to the IP) for login/register.
    // - `ip` is a high per-IP ceiling so a bogus-credential flood can't dodge
    //   limiting by minting a new bucket per request.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
        getTracker: bearerTracker,
      },
      {
        name: 'ip',
        ttl: 60_000,
        limit: 3_000,
        getTracker: ipTracker,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('database.url'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    AuthModule,
    ProjectsModule,
    ExperimentsModule,
    GenerationsModule,
    DatasetsModule,
    AssetsModule,
    TrainingRunsModule,
    TrainingRunMetricsModule,
    EvaluationResultsModule,
    ReproductionModule,
    DocumentationModule,
    ComparisonsModule,
    ReportsModule,
    SearchModule,
    WorkspaceModule,
    ApiKeysModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}