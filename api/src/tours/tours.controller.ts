import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { CreateTourDto } from './dto/create-tour.dto.js';
import { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import { UpdateTourDto } from './dto/update-tour.dto.js';
import { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { ToursService } from './tours.service.js';

const ROUTE_REBUILD_ALLOWED_ROLES = new Set(['manager', 'admin', 'super_admin']);

@Controller('tours')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
export class ToursController {
  constructor(@Inject(ToursService) private readonly toursService: ToursService) {}

  @Get()
  @RequirePermissions('ecotrack.tours.read')
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('zoneId') zoneId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);
    const { items, total } = await this.toursService.list({
      search: normalizeSearchTerm(q),
      status: normalizeSearchTerm(status),
      zoneId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      tours: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Get('agent/me')
  @RequirePermissions('ecotrack.tours.read')
  async getAgentTour(@Req() request: RequestWithAuthUser) {
    return this.toursService.getAgentTour(this.requireUserId(request));
  }

  @Get('anomaly-types')
  @RequirePermissions('ecotrack.tours.read')
  async anomalyTypes() {
    return { anomalyTypes: await this.toursService.listAnomalyTypes() };
  }

  @Get(':id/activity')
  @RequirePermissions('ecotrack.tours.read')
  async tourActivity(@Param('id', new ParseUUIDPipe()) id: string) {
    return { activity: await this.toursService.getTourActivity(id) };
  }

  @Post()
  @RequirePermissions('ecotrack.tours.write')
  async create(@Body() dto: CreateTourDto) {
    return this.toursService.create(dto);
  }

  @Post(':id/start')
  @RequirePermissions('ecotrack.tours.write')
  async startTour(@Req() request: RequestWithAuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.toursService.startTour(id, this.requireUserId(request));
  }

  @Post(':tourId/stops/:stopId/validate')
  @RequirePermissions('ecotrack.tours.write')
  async validateStop(
    @Req() request: RequestWithAuthUser,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: ValidateTourStopDto,
  ) {
    return this.toursService.validateStop(tourId, stopId, this.requireUserId(request), dto);
  }

  @Post(':tourId/anomalies')
  @RequirePermissions('ecotrack.tours.write')
  async reportAnomaly(
    @Req() request: RequestWithAuthUser,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
    @Body() dto: ReportAnomalyDto,
  ) {
    return this.toursService.reportAnomaly(tourId, this.requireUserId(request), dto);
  }

  @Put(':id')
  @RequirePermissions('ecotrack.tours.write')
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTourDto) {
    return this.toursService.update(id, dto);
  }

  @Post(':id/route/rebuild')
  @RequirePermissions('ecotrack.tours.write')
  async rebuildRoute(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.toursService.rebuildRoute(id, this.requireRouteRebuildAccess(request));
  }

  private requireUserId(request: RequestWithAuthUser) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return userId;
  }

  private requireRouteRebuildAccess(request: RequestWithAuthUser) {
    const userId = this.requireUserId(request);
    const authUser = request.authUser;
    const roleNames = new Set<string>();

    const primaryRole = authUser?.role?.trim().toLowerCase();
    if (primaryRole) {
      roleNames.add(primaryRole);
    }

    if (Array.isArray(authUser?.roles)) {
      for (const role of authUser.roles) {
        const normalizedRole = role?.name?.trim().toLowerCase();
        if (normalizedRole) {
          roleNames.add(normalizedRole);
        }
      }
    }

    const hasAccess = Array.from(roleNames).some((roleName) =>
      ROUTE_REBUILD_ALLOWED_ROLES.has(roleName),
    );

    if (!hasAccess) {
      throw new ForbiddenException('Only manager or admin users can rebuild persisted routes.');
    }

    return userId;
  }
}
