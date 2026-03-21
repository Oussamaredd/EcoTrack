import { Module } from '@nestjs/common';

import { InternalEventRuntimeService } from './internal-events.runtime.js';

@Module({
  providers: [InternalEventRuntimeService],
  exports: [InternalEventRuntimeService],
})
export class InternalEventsModule {}
