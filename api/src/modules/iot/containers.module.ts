import { Module } from '@nestjs/common';

import { ContainersController } from './containers.controller.js';
import { ContainersRepository } from './containers.repository.js';
import { ContainersService } from './containers.service.js';
import { IngestionModule } from './ingestion/ingestion.module.js';

@Module({
  controllers: [ContainersController],
  providers: [ContainersRepository, ContainersService],
  exports: [ContainersService],
  imports: [IngestionModule],
})
export class ContainersModule {}

