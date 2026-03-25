import { Injectable } from '@nestjs/common';

import { readCurrentActiveStopId, type CreateCollectionTourCommandInput } from './collection-domain.contracts.js';
import { CollectionsDomainRepository } from './collections-domain.repository.js';
import type { CreateTourDto } from './dto/create-tour.dto.js';
import type { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import type { UpdateTourDto } from './dto/update-tour.dto.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { ToursRepository } from './tours.repository.js';

@Injectable()
export class ToursCommandService {
  constructor(
    private readonly domainRepository: CollectionsDomainRepository,
    private readonly toursRepository: ToursRepository,
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
      return {
        event: null,
        validatedStopId: stopId,
        nextStopId: readCurrentActiveStopId(result.aggregate),
        alreadyValidated: true,
      };
    }

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
