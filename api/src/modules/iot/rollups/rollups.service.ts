import { Injectable } from '@nestjs/common';

import { InternalEventSchemaRegistryService } from '../../events/internal-event-schema-registry.service.js';
import type { ClaimedValidatedEventDelivery } from '../validated-consumer/validated-consumer.contracts.js';

import type { MeasurementRollupFilters } from './rollups.contracts.js';
import { MeasurementRollupsRepository } from './rollups.repository.js';

@Injectable()
export class MeasurementRollupsService {
  constructor(
    private readonly repository: MeasurementRollupsRepository,
    private readonly schemaRegistry: InternalEventSchemaRegistryService,
  ) {}

  async projectValidatedEventRollup(delivery: ClaimedValidatedEventDelivery) {
    const schemaVersion = this.schemaRegistry.getLatestSchema('iot.measurement.rollup.10m').version;
    return this.repository.projectValidatedEventRollup(delivery, schemaVersion);
  }

  async listLatestRollups(filters: MeasurementRollupFilters = {}) {
    return this.repository.listLatestRollups(filters);
  }
}
