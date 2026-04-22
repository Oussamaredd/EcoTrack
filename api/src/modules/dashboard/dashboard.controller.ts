import { Controller, Get, Inject, InternalServerErrorException, UseGuards } from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ResponseCache } from '../performance/http-response-cache.decorator.js';

import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
@RequirePermissions('ecotrack.analytics.read')
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  @ResponseCache({
    cacheTags: ['dashboard'],
    maxAgeSeconds: 300,
    scope: 'private',
    staleWhileRevalidateSeconds: 300,
    vary: ['Authorization', 'Cookie'],
  })
  async getDashboard() {
    try {
      return await this.dashboardService.getDashboard();
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      throw new InternalServerErrorException('Unable to fetch dashboard data');
    }
  }
}

