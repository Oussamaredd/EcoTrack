export const CACHE_NAMESPACES = {
  analytics: 'analytics',
  dashboard: 'dashboard',
  planning: 'planning',
} as const;

export const createCitizenCacheNamespace = (userId: string) => `citizen:${userId}`;
