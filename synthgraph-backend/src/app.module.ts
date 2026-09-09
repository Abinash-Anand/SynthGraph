import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module.js';
import configuration from './config/configuration.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ExperimentsModule } from './experiments/experiments.module.js';
import { GenerationsModule } from './generations/generations.module.js';
import { DatasetsModule } from './datasets/datasets.module.js';
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
        synchronize: false,
      }),
    }),

    AuthModule,
    ProjectsModule,
    ExperimentsModule,
    GenerationsModule,
    DatasetsModule
  ],
})
export class AppModule {}