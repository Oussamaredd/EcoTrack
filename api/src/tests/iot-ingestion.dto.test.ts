import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { IngestMeasurementDto } from '../modules/iot/ingestion/dto/ingest-measurement.dto.js';

describe('IngestMeasurementDto', () => {
  it('rejects invalid measurement payloads', async () => {
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    await expect(
      validationPipe.transform(
        {
          deviceUid: 'sensor-001',
          fillLevelPercent: 'invalid',
        },
        {
          type: 'body',
          metatype: IngestMeasurementDto,
        },
      ),
    ).rejects.toThrow();
  });
});
