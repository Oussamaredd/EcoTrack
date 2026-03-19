import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { ContainersModule } from '../modules/iot/containers.module.js';
import { IngestionModule } from '../modules/iot/ingestion/ingestion.module.js';

describe('IoT module wiring', () => {
  it('loads the ingestion and containers modules without circular import failures', () => {
    expect(ContainersModule).toBeDefined();
    expect(IngestionModule).toBeDefined();
  });
});
