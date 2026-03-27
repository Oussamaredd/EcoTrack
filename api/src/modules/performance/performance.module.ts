import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CacheService } from './cache.service.js';
import { HttpResponseCacheInterceptor } from './http-response-cache.interceptor.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService, HttpResponseCacheInterceptor],
  exports: [CacheService, HttpResponseCacheInterceptor],
})
export class PerformanceModule {}
