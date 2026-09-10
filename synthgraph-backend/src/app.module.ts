import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module.js';
import { ComparisonsModule } from './comparisons/comparisons.module.js';
import configuration from './config/configuration.js';
import { DatasetsModule } from './datasets/datasets.module.js';
import { DocumentationModule } from './documentation/documentation.module.js';
import { EvaluationResultsModule } from './evaluation-results/evaluation-results.module.js';
import { ExperimentsModule } from './experiments/experiments.module.js';
import { GenerationsModule } from './generations/generations.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ReproductionModule } from './reproduction/reproduction.module.js';
import { TrainingRunsModule } from './training-runs/training-runs.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('database.url'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    AuthModule,
    ProjectsModule,
    ExperimentsModule,
    GenerationsModule,
    DatasetsModule,
    TrainingRunsModule,
    EvaluationResultsModule,
    ReproductionModule,
    DocumentationModule,
    ComparisonsModule,
    ApiKeysModule
  ],
})
export class AppModule {}