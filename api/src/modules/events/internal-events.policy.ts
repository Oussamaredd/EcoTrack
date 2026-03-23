import { BadRequestException, Injectable } from '@nestjs/common';

import { InternalEventSchemaRegistryService } from './internal-event-schema-registry.service.js';
import { INTERNAL_EVENT_POLICIES } from './internal-events.catalog.js';
import type {
  InternalEventConsumerName,
  InternalEventEnvelope,
  InternalEventName,
  InternalEventPolicy,
} from './internal-events.contracts.js';

@Injectable()
export class InternalEventPolicyService {
  constructor(private readonly schemaRegistry: InternalEventSchemaRegistryService) {}

  private readonly policies = new Map<InternalEventName, InternalEventPolicy>(
    INTERNAL_EVENT_POLICIES.map((policy) => [policy.eventName, policy]),
  );

  getPolicy(eventName: string): InternalEventPolicy {
    const policy = this.policies.get(eventName as InternalEventName);
    if (!policy) {
      throw new BadRequestException(`Unknown internal event policy for '${eventName}'.`);
    }

    return policy;
  }

  assertProducerAuthorized(envelope: InternalEventEnvelope): InternalEventPolicy {
    const policy = this.getPolicy(envelope.eventName);

    if (!policy.allowedProducers.includes(envelope.producerName)) {
      throw new BadRequestException(
        `Producer '${envelope.producerName}' is not authorized to emit '${envelope.eventName}'.`,
      );
    }

    if (envelope.schemaVersion !== policy.schemaVersion) {
      throw new BadRequestException(
        `Schema version '${envelope.schemaVersion}' is not allowed for '${envelope.eventName}'.`,
      );
    }

    this.schemaRegistry.assertSchemaVersionRegistered(policy.schemaSubject, envelope.schemaVersion);

    return policy;
  }

  assertConsumerAuthorized(eventName: string, consumerName: string) {
    const policy = this.getPolicy(eventName);

    if (!policy.allowedConsumers.includes(consumerName as InternalEventConsumerName)) {
      throw new BadRequestException(
        `Consumer '${consumerName}' is not authorized to process '${eventName}'.`,
      );
    }

    return policy;
  }

  assertReplayable(eventName: string) {
    const policy = this.getPolicy(eventName);

    if (!policy.replayable) {
      throw new BadRequestException(`Internal event '${eventName}' is not replayable.`);
    }

    return policy;
  }

  getAuthorizedConsumers(eventName: InternalEventName) {
    return [...this.getPolicy(eventName).allowedConsumers];
  }

  getAuthorizedProducers(eventName: InternalEventName) {
    return [...this.getPolicy(eventName).allowedProducers];
  }
}
