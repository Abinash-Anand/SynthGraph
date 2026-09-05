import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ExperimentsController } from './experiments.controller.js';
import { GenerationsController } from './generations.controller.js';
import { ProjectsController } from './projects.controller.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [],
  controllers: [AppController,
     ProjectsController,
    ExperimentsController,
    GenerationsController,
    HealthController
  ],
  providers: [AppService],
  
})
export class AppModule {}
