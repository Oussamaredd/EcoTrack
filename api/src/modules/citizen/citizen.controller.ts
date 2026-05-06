import {
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { parsePaginationParams } from '../../common/http/pagination.js';
import { loadRuntimeFeatureFlags } from '../../config/runtime-features.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { ResponseCache } from '../performance/http-response-cache.decorator.js';

import { CitizenService } from './citizen.service.js';
import { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';
import { RegisterNotificationDeviceDto } from './dto/register-notification-device.dto.js';
import { UpdateChallengeProgressDto } from './dto/update-challenge-progress.dto.js';

const RUNTIME_FEATURE_FLAGS = loadRuntimeFeatureFlags(process.env as Record<string, unknown>);
const CITIZEN_ACCESS_ROLES = new Set(['citizen', 'admin', 'super_admin']);

@Controller('citizen')
@UseGuards(AuthenticatedUserGuard)
export class CitizenController {
  constructor(@Inject(CitizenService) private readonly citizenService: CitizenService) {}

  @Post('reports')
  async createReport(@Req() request: RequestWithAuthUser, @Body() dto: CreateCitizenReportDto) {
    return this.citizenService.createReport(this.requireCitizenUserId(request), dto);
  }

  @Post('notifications/devices')
  async registerNotificationDevice(
    @Req() request: RequestWithAuthUser,
    @Body() dto: RegisterNotificationDeviceDto,
  ) {
    return this.citizenService.registerNotificationDevice(this.requireCitizenUserId(request), dto);
  }

  @Get('notifications')
  @ResponseCache({
    cacheTags: ['citizen-notifications'],
    maxAgeSeconds: 30,
    scope: 'private',
    staleWhileRevalidateSeconds: 60,
    vary: ['Authorization', 'Cookie'],
  })
  async notifications(
    @Req() request: RequestWithAuthUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return {
      notifications: await this.citizenService.listNotifications(
        this.requireCitizenUserId(request),
        limit ?? 20,
      ),
    };
  }

  @Post('notifications/:id/read')
  async markNotificationRead(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.citizenService.markNotificationRead(
      this.requireCitizenUserId(request),
      notificationId,
    );
  }

  @Get('profile')
  @ResponseCache({
    cacheTags: ['citizen-profile'],
    maxAgeSeconds: 30,
    scope: 'private',
    staleWhileRevalidateSeconds: 60,
    vary: ['Authorization', 'Cookie'],
  })
  async profile(@Req() request: RequestWithAuthUser) {
    return this.citizenService.getProfile(this.requireCitizenUserId(request));
  }

  @Get('history')
  @ResponseCache({
    cacheTags: ['citizen-history'],
    maxAgeSeconds: 30,
    scope: 'private',
    staleWhileRevalidateSeconds: 60,
    vary: ['Authorization', 'Cookie'],
  })
  async history(
    @Req() request: RequestWithAuthUser,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ) {
    const pagination = parsePaginationParams(pageParam, pageSizeParam);
    const { items, total } = await this.citizenService.getHistory(
      this.requireCitizenUserId(request),
      pagination.limit,
      pagination.offset,
    );

    return {
      history: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Get('challenges')
  @ResponseCache({
    cacheTags: ['citizen-challenges'],
    maxAgeSeconds: 30,
    scope: 'private',
    staleWhileRevalidateSeconds: 60,
    vary: ['Authorization', 'Cookie'],
  })
  async challenges(@Req() request: RequestWithAuthUser) {
    this.requireCitizenChallengesEnabled();
    const items = await this.citizenService.listChallenges(this.requireCitizenUserId(request));
    return { challenges: items };
  }

  @Post('challenges/:id/enroll')
  async enroll(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
  ) {
    this.requireCitizenChallengesEnabled();
    return this.citizenService.enrollInChallenge(this.requireCitizenUserId(request), challengeId);
  }

  @Post('challenges/:id/progress')
  async progress(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    this.requireCitizenChallengesEnabled();
    return this.citizenService.updateChallengeProgress(
      this.requireCitizenUserId(request),
      challengeId,
      dto.progressDelta,
    );
  }

  private requireCitizenChallengesEnabled() {
    if (!RUNTIME_FEATURE_FLAGS.citizenChallengesEnabled) {
      throw new ServiceUnavailableException('Citizen challenges are disabled.');
    }
  }

  private requireCitizenUserId(request: RequestWithAuthUser) {
    const authUser = request.authUser;
    const userId = authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const roleNames = new Set<string>();
    if (typeof authUser.role === 'string') {
      roleNames.add(authUser.role.trim().toLowerCase());
    }

    for (const role of authUser.roles ?? []) {
      if (typeof role.name === 'string') {
        roleNames.add(role.name.trim().toLowerCase());
      }
    }

    if (![...roleNames].some((roleName) => CITIZEN_ACCESS_ROLES.has(roleName))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return userId;
  }
}

