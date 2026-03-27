import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { parsePaginationParams } from '../../common/http/pagination.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { ResponseCache } from '../performance/http-response-cache.decorator.js';

import { CitizenService } from './citizen.service.js';
import { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';
import { RegisterNotificationDeviceDto } from './dto/register-notification-device.dto.js';
import { UpdateChallengeProgressDto } from './dto/update-challenge-progress.dto.js';

@Controller('citizen')
@UseGuards(AuthenticatedUserGuard)
export class CitizenController {
  constructor(@Inject(CitizenService) private readonly citizenService: CitizenService) {}

  @Post('reports')
  async createReport(@Req() request: RequestWithAuthUser, @Body() dto: CreateCitizenReportDto) {
    return this.citizenService.createReport(this.requireUserId(request), dto);
  }

  @Post('notifications/devices')
  async registerNotificationDevice(
    @Req() request: RequestWithAuthUser,
    @Body() dto: RegisterNotificationDeviceDto,
  ) {
    return this.citizenService.registerNotificationDevice(this.requireUserId(request), dto);
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
        this.requireUserId(request),
        limit ?? 20,
      ),
    };
  }

  @Post('notifications/:id/read')
  async markNotificationRead(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.citizenService.markNotificationRead(this.requireUserId(request), notificationId);
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
    return this.citizenService.getProfile(this.requireUserId(request));
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
      this.requireUserId(request),
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
    const items = await this.citizenService.listChallenges(this.requireUserId(request));
    return { challenges: items };
  }

  @Post('challenges/:id/enroll')
  async enroll(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
  ) {
    return this.citizenService.enrollInChallenge(this.requireUserId(request), challengeId);
  }

  @Post('challenges/:id/progress')
  async progress(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    return this.citizenService.updateChallengeProgress(
      this.requireUserId(request),
      challengeId,
      dto.progressDelta,
    );
  }

  private requireUserId(request: RequestWithAuthUser) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}

