import { type MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../database/database.module.js';
import { PerformanceModule } from '../performance/performance.module.js';

import { HttpMetricsMiddleware } from './http-metrics.middleware.js';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringRepository } from './monitoring.repository.js';
import { MonitoringService } from './monitoring.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule, PerformanceModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepository, HttpMetricsMiddleware],
  exports: [MonitoringService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

