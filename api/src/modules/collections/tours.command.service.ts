import { Injectable, Logger } from '@nestjs/common';

import { ContainersService } from '../iot/containers.service.js';
import { CACHE_NAMESPACES } from '../performance/cache.constants.js';
import { CacheService } from '../performance/cache.service.js';

import {
  readCurrentActiveStopId,
  type CollectionAggregateState,
  type CreateCollectionTourCommandInput,
} from './collection-domain.contracts.js';
import { CollectionsDomainRepository } from './collections-domain.repository.js';
import type { CreateTourDto } from './dto/create-tour.dto.js';
import type { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import type { UpdateTourDto } from './dto/update-tour.dto.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { ToursRepository } from './tours.repository.js';

@Injectable()
export class ToursCommandService {
  private readonly logger = new Logger(ToursCommandService.name);

  constructor(
    private readonly domainRepository: CollectionsDomainRepository,
    private readonly toursRepository: ToursRepository,
    private readonly containersService: ContainersService,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateTourDto, actorUserId?: string | null) {
    const result = await this.domainRepository.createScheduledTour(
      this.toCreateCollectionTourCommand(dto),
      {
        actorUserId: actorUserId ?? null,
        traceparent: null,
        tracestate: null,
      },
    );

    const [tour, stops] = await Promise.all([
      this.toursRepository.getTourById(result.aggregate.tourId),
      this.toursRepository.getTourRouteStops(result.aggregate.tourId),
    ]);

    return {
      ...(tour ?? {
        id: result.aggregate.tourId,
        name: result.aggregate.name,
        status: result.aggregate.status,
        scheduledFor: new Date(result.aggregate.scheduledFor),
        zoneId: result.aggregate.zoneId,
        assignedAgentId: result.aggregate.assignedAgentId,
      }),
      stops,
    };
  }

  async createManagedTour(
    command: CreateCollectionTourCommandInput,
    actorUserId: string | null,
  ) {
    const result = await this.domainRepository.createScheduledTour(command, {
      actorUserId,
      traceparent: null,
      tracestate: null,
    });

    return this.toursRepository.getTourById(result.aggregate.tourId);
  }

  async update(id: string, dto: UpdateTourDto, actorUserId?: string | null) {
    await this.domainRepository.updateTour(
      id,
      {
        name: dto.name,
        status: dto.status as 'planned' | 'in_progress' | 'completed' | 'cancelled' | undefined,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        zoneId: dto.zoneId,
        assignedAgentId: dto.assignedAgentId,
        stops:
          Array.isArray(dto.stopContainerIds) && dto.stopContainerIds.length > 0
            ? dto.stopContainerIds.map((containerId) => ({
                containerId,
              }))
            : undefined,
      },
      {
        actorUserId: actorUserId ?? null,
        traceparent: null,
        tracestate: null,
      },
    );

    return this.toursRepository.getTourById(id);
  }

  async startTour(tourId: string, actorUserId: string) {
    const result = await this.domainRepository.startTour(tourId, actorUserId, {
      actorUserId,
      traceparent: null,
      tracestate: null,
    });

    return {
      id: result.aggregate.tourId,
      name: result.aggregate.name,
      status: result.aggregate.status,
      scheduledFor: new Date(result.aggregate.scheduledFor),
      zoneId: result.aggregate.zoneId,
      assignedAgentId: result.aggregate.assignedAgentId,
      startedAt: result.aggregate.startedAt ? new Date(result.aggregate.startedAt) : null,
      completedAt: result.aggregate.completedAt ? new Date(result.aggregate.completedAt) : null,
      firstActiveStopId: readCurrentActiveStopId(result.aggregate),
    };
  }

  async validateStop(
    tourId: string,
    stopId: string,
    actorUserId: string,
    dto: ValidateTourStopDto,
  ) {
    const result = await this.domainRepository.validateStop(tourId, stopId, actorUserId, dto, {
      actorUserId,
      traceparent: null,
      tracestate: null,
    });

    if (result.createdEventIds.length === 0) {
      await this.resetCompletedStopContainer(result.aggregate, stopId);

      return {
        event: null,
        validatedStopId: stopId,
        nextStopId: readCurrentActiveStopId(result.aggregate),
        alreadyValidated: true,
      };
    }

    await this.resetCompletedStopContainer(result.aggregate, stopId);

    return {
      event: await this.toursRepository.getLatestCollectionEventForStop(stopId),
      validatedStopId: stopId,
      nextStopId: readCurrentActiveStopId(result.aggregate),
      alreadyValidated: false,
    };
  }

  async reportAnomaly(tourId: string, actorUserId: string, dto: ReportAnomalyDto) {
    return this.toursRepository.reportAnomaly(tourId, actorUserId, dto);
  }

  private async resetCompletedStopContainer(
    aggregate: CollectionAggregateState,
    stopId: string,
  ) {
    const completedStop = aggregate.stops.find(s => s.id === stopId);
    if (completedStop && completedStop.status === 'completed') {
      const measuredAt = completedStop.completedAt ?? new Date().toISOString();
      this.logger.log(
        `Resetting container ${completedStop.containerId} to 0% after collection`,
      );
      await this.containersService.recordMeasurement(completedStop.containerId, {
        fillLevelPercent: 0,
        deviceUid: 'collection-reset',
        measuredAt,
        measurementQuality: 'valid',
      });
      await this.cacheService.invalidateNamespaces([
        CACHE_NAMESPACES.planning,
        CACHE_NAMESPACES.analytics,
      ]);
    }
  }

  private toCreateCollectionTourCommand(dto: CreateTourDto): CreateCollectionTourCommandInput {
    return {
      name: dto.name,
      status: dto.status as 'planned' | 'in_progress' | 'completed' | 'cancelled' | undefined,
      scheduledFor: new Date(dto.scheduledFor),
      zoneId: dto.zoneId ?? null,
      assignedAgentId: dto.assignedAgentId ?? null,
      stops: dto.stopContainerIds.map((containerId) => ({
        containerId,
      })),
    };
  }
}
