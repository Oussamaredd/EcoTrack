import { afterEach, describe, expect, it } from 'vitest';

import { InMemoryIngestionQueue } from '../modules/iot/ingestion/ingestion.queue.js';
import type { ProcessedMeasurement } from '../modules/iot/ingestion/ingestion.repository.js';

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

const waitFor = async (predicate: () => boolean, timeoutMs = 1000) => {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition.');
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const createProcessedMeasurement = (id: number): ProcessedMeasurement => ({
  deviceUid: `sensor-${id}`,
  measurement: {
    sensorDeviceId: null,
    containerId: null,
    measuredAt: new Date(),
    fillLevelPercent: 50,
    temperatureC: null,
    batteryPercent: null,
    signalStrength: null,
    measurementQuality: 'valid',
    sourcePayload: { source: 'iot-ingestion-api', deviceUid: `sensor-${id}` },
    receivedAt: new Date(),
  },
});

describe('InMemoryIngestionQueue', () => {
  let queue: InMemoryIngestionQueue;

  afterEach(() => {
    queue?.stopProcessor();
  });

  it('tracks pending measurements and drains them with the configured concurrency', async () => {
    queue = new InMemoryIngestionQueue();

    await queue.enqueue([createProcessedMeasurement(1)]);
    await queue.enqueue([createProcessedMeasurement(2)]);
    await queue.enqueue([createProcessedMeasurement(3)]);

    const deferredBatches = [createDeferred(), createDeferred(), createDeferred()];
    let observedActiveWorkers = 0;
    let maxActiveWorkers = 0;
    let startedBatches = 0;

    queue.startProcessor(
      async () => {
        observedActiveWorkers += 1;
        maxActiveWorkers = Math.max(maxActiveWorkers, observedActiveWorkers);

        const deferred = deferredBatches[startedBatches];
        startedBatches += 1;
        await deferred.promise;

        observedActiveWorkers -= 1;
      },
      {
        concurrency: 2,
        maxBatchMeasurements: 1,
      },
    );

    await waitFor(() => startedBatches === 2);
    expect(maxActiveWorkers).toBe(2);
    expect(await queue.getPendingCount()).toBe(1);

    deferredBatches[0].resolve();
    deferredBatches[1].resolve();
    await waitFor(() => startedBatches === 3);

    deferredBatches[2].resolve();
    await waitFor(() => queue.getProcessedLastHour() === 3);
    expect(await queue.getPendingCount()).toBe(0);
  });
});
