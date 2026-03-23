import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  InMemoryValidatedDeliveryQueue,
  type ValidatedDeliveryJob,
} from '../modules/iot/validated-consumer/validated-consumer.queue.js';

const flushQueue = async (ticks = 8) => {
  for (let index = 0; index < ticks; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

describe('InMemoryValidatedDeliveryQueue', () => {
  let queue: InMemoryValidatedDeliveryQueue | undefined;

  afterEach(() => {
    queue?.onModuleDestroy();
    queue = undefined;
    vi.restoreAllMocks();
  });

  it('batches deliveries up to the configured maximum', async () => {
    queue = new InMemoryValidatedDeliveryQueue();
    queue.onModuleInit();
    const handler = vi.fn().mockResolvedValue(undefined);

    await queue.enqueue('timeseries_projection', ['delivery-prestart']);
    queue.startProcessor(handler, { concurrency: 1, maxBatchDeliveries: 3 });
    await queue.enqueue('timeseries_projection', ['delivery-1']);
    await queue.enqueue('timeseries_projection', ['delivery-2', 'delivery-3']);
    await queue.enqueue('timeseries_projection', ['delivery-4']);

    await flushQueue();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[0].flatMap((job: { deliveryIds: string[] }) => job.deliveryIds)).toEqual([
      'delivery-prestart',
      'delivery-1',
    ]);
    expect(handler.mock.calls[1]?.[0].flatMap((job: { deliveryIds: string[] }) => job.deliveryIds)).toEqual([
      'delivery-2',
      'delivery-3',
      'delivery-4',
    ]);
  });

  it('requeues failed batches and retries them', async () => {
    queue = new InMemoryValidatedDeliveryQueue();
    const loggerErrorSpy = vi
      .spyOn((queue as any).logger, 'error')
      .mockImplementation(() => undefined);
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('queue unavailable'))
      .mockResolvedValueOnce(undefined);

    queue.startProcessor(handler, { concurrency: 1, maxBatchDeliveries: 10 });
    await queue.enqueue('timeseries_projection', ['delivery-1', 'delivery-2']);

    await flushQueue();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[0][0].deliveryIds).toEqual(['delivery-1', 'delivery-2']);
    expect(handler.mock.calls[1]?.[0][0].deliveryIds).toEqual(['delivery-1', 'delivery-2']);
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('keeps the same shard runnable when different consumers share it', async () => {
    queue = new InMemoryValidatedDeliveryQueue();
    queue.onModuleInit();
    const processed: Array<{ consumerName: string; deliveryIds: string[] }> = [];
    const handler = vi.fn().mockImplementation(async (jobs: ValidatedDeliveryJob[]) => {
      processed.push(
        ...jobs.map((job) => ({
          consumerName: job.consumerName,
          deliveryIds: job.deliveryIds,
        })),
      );
    });

    queue.startProcessor(handler, { concurrency: 2, maxBatchDeliveries: 10 });
    await queue.enqueue('timeseries_projection', ['delivery-1'], 4);
    await queue.enqueue('measurement_rollup_projection', ['delivery-2'], 4);

    await flushQueue();

    expect(processed).toEqual(
      expect.arrayContaining([
        { consumerName: 'timeseries_projection', deliveryIds: ['delivery-1'] },
        { consumerName: 'measurement_rollup_projection', deliveryIds: ['delivery-2'] },
      ]),
    );
  });
});
