import { Injectable } from '@nestjs/common';

import { ContainersRepository } from './containers.repository.js';
import type { CreateContainerDto } from './dto/create-container.dto.js';
import type { RecordContainerMeasurementDto } from './dto/record-container-measurement.dto.js';
import type { UpdateContainerDto } from './dto/update-container.dto.js';
import type { UpsertContainerSensorDto } from './dto/upsert-container-sensor.dto.js';

type ContainerListFilters = {
  search?: string;
  zoneId?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ContainersService {
  constructor(private readonly repository: ContainersRepository) {}

  async list(filters: ContainerListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateContainerDto) {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateContainerDto) {
    return this.repository.update(id, dto);
  }

  async listTypes() {
    return this.repository.listTypes();
  }

  async getTelemetry(containerId: string, limit: number) {
    return this.repository.getTelemetry(containerId, limit);
  }

  async upsertSensor(containerId: string, dto: UpsertContainerSensorDto) {
    return this.repository.upsertSensor(containerId, dto);
  }

  async recordMeasurement(containerId: string, dto: RecordContainerMeasurementDto) {
    return this.repository.recordMeasurement(containerId, dto);
  }
}
