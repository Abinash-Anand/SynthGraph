import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Generation } from '../database/entities/generation.entity.js';
import { TypeOrmGenerationRepository } from '../generations/repositories/typeorm-generation.repository.js';

import { ComparisonsController } from './comparisons.controller.js';
import { CompareGenerationsService } from './services/compare-generations.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Generation]),
  ],
  controllers: [ComparisonsController],
  providers: [
    TypeOrmGenerationRepository,
    CompareGenerationsService,
  ],
})
export class ComparisonsModule {}