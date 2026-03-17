import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../../database/database.module.js';
import { ContainersModule } from '../containers.module.js';

import { IngestionController } from './ingestion.controller.js';
import { InMemoryIngestionQueue } from './ingestion.queue.js';
import { IngestionRepository } from './ingestion.repository.js';
import { IngestionService } from './ingestion.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule, ContainersModule],
  controllers: [IngestionController],
  providers: [IngestionRepository, IngestionService, InMemoryIngestionQueue],
  exports: [IngestionService],
})
export class IngestionModule {}
