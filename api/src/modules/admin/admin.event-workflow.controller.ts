import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminUser } from './admin.decorators.js';
import { AdminEventWorkflowService } from './admin.event-workflow.service.js';
import { AdminGuard } from './admin.guard.js';
import type { AdminUserContext } from './admin.types.js';
import { ListReplayableDeliveriesDto } from './dto/list-replayable-deliveries.dto.js';
import { ListReplayableStagedEventsDto } from './dto/list-replayable-staged-events.dto.js';
import { ReplayDeliveriesDto } from './dto/replay-deliveries.dto.js';
import { ReplayStagedEventsDto } from './dto/replay-staged-events.dto.js';

@Controller('admin/event-workflow')
@UseGuards(AdminGuard)
export class AdminEventWorkflowController {
  constructor(
    @Inject(AdminEventWorkflowService)
    private readonly eventWorkflowService: AdminEventWorkflowService,
  ) {}

  @Get('replay/staged')
  async listReplayableStagedEvents(@Query() query: ListReplayableStagedEventsDto) {
    try {
      const rows = await this.eventWorkflowService.listReplayableStagedEvents(query);
      return { data: rows };
    } catch (error) {
      console.error('Failed to fetch replayable staged ingestion events', error);
      throw new InternalServerErrorException('Unable to fetch replayable staged ingestion events');
    }
  }

  @Post('replay/staged')
  async replayStagedEvents(
    @Body() body: ReplayStagedEventsDto,
    @AdminUser() adminUser: AdminUserContext,
  ) {
    try {
      const result = await this.eventWorkflowService.replayStagedEvents(body, adminUser?.id ?? null);
      return { data: result };
    } catch (error) {
      console.error('Failed to replay staged ingestion events', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to replay staged ingestion events');
    }
  }

  @Get('replay/deliveries')
  async listReplayableDeliveries(@Query() query: ListReplayableDeliveriesDto) {
    try {
      const rows = await this.eventWorkflowService.listReplayableDeliveries(query);
      return { data: rows };
    } catch (error) {
      console.error('Failed to fetch replayable validated-event deliveries', error);
      throw new InternalServerErrorException('Unable to fetch replayable validated-event deliveries');
    }
  }

  @Post('replay/deliveries')
  async replayDeliveries(
    @Body() body: ReplayDeliveriesDto,
    @AdminUser() adminUser: AdminUserContext,
  ) {
    try {
      const result = await this.eventWorkflowService.replayDeliveries(body, adminUser?.id ?? null);
      return { data: result };
    } catch (error) {
      console.error('Failed to replay validated-event deliveries', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to replay validated-event deliveries');
    }
  }
}
