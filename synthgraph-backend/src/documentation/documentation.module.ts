import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ReproductionModule } from '../reproduction/reproduction.module.js';

import { DocumentationController } from './documentation.controller.js';
import { GetDocumentationService } from './services/get-documentation.service.js';

@Module({
  imports: [
    AuthModule,
    ReproductionModule,
  ],

  controllers: [
    DocumentationController,
  ],

  providers: [
    GetDocumentationService,
  ],
})
export class DocumentationModule {}