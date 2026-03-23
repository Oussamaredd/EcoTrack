import { type MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../database/database.module.js';

import { HttpMetricsMiddleware } from './http-metrics.middleware.js';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringRepository } from './monitoring.repository.js';
import { MonitoringService } from './monitoring.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepository, HttpMetricsMiddleware],
  exports: [MonitoringService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

