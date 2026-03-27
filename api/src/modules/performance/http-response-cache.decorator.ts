import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';

import { HttpResponseCacheInterceptor } from './http-response-cache.interceptor.js';

export const HTTP_RESPONSE_CACHE_METADATA = 'ecotrack:http-response-cache';

export type HttpResponseCacheOptions = {
  cacheTags?: string[];
  cdnMaxAgeSeconds?: number;
  maxAgeSeconds: number;
  scope?: 'private' | 'public';
  staleWhileRevalidateSeconds?: number;
  vary?: string[];
};

export const ResponseCache = (options: HttpResponseCacheOptions) =>
  applyDecorators(
    SetMetadata(HTTP_RESPONSE_CACHE_METADATA, options),
    UseInterceptors(HttpResponseCacheInterceptor),
  );
