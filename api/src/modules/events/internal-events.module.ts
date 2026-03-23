import { Module } from '@nestjs/common';

import { InternalEventSchemaRegistryService } from './internal-event-schema-registry.service.js';
import { InternalEventPolicyService } from './internal-events.policy.js';
import { InternalEventRuntimeService } from './internal-events.runtime.js';

@Module({
  providers: [
    InternalEventRuntimeService,
    InternalEventSchemaRegistryService,
    InternalEventPolicyService,
  ],
  exports: [
    InternalEventRuntimeService,
    InternalEventSchemaRegistryService,
    InternalEventPolicyService,
  ],
})
export class InternalEventsModule {}
