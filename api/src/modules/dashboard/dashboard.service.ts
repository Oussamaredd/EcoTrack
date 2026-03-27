import { Injectable } from '@nestjs/common';

import { CACHE_NAMESPACES } from '../performance/cache.constants.js';
import { CacheService } from '../performance/cache.service.js';

import { DashboardRepository, type DashboardResponse } from './dashboard.repository.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboard(): Promise<DashboardResponse> {
    return this.cacheService.getOrLoad({
      key: 'workspace-dashboard',
      loader: () => this.dashboardRepository.getDashboard(),
      namespace: CACHE_NAMESPACES.dashboard,
      profile: 'dashboard',
    });
  }
}

