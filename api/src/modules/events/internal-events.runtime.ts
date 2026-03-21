import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class InternalEventRuntimeService {
  private readonly instanceId = this.createInstanceId();

  getInstanceId() {
    return this.instanceId;
  }

  private createInstanceId() {
    const hostname = process.env.HOSTNAME?.trim() || 'local';
    const sanitizedHostname = hostname.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${sanitizedHostname}:${process.pid}:${randomUUID().slice(0, 8)}`;
  }
}
