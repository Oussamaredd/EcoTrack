import { describe, expect, it, vi } from 'vitest';

import { HealthService } from '../modules/health/health.service.js';

const createSelectionChain = (error?: Error) => {
  const chain: {
    from: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.from = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue([]);

  return chain;
};

describe('HealthService', () => {
  it('returns ok when the ticketing and planning schema dependencies are queryable', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain()),
    };

    const service = new HealthService(dbMock as never);
    const result = await service.checkDatabase();

    expect(result).toEqual({
      status: 'ok',
      checks: [
        { name: 'ticketing.schema', status: 'ok' },
        { name: 'planning.dashboard.schema', status: 'ok' },
        { name: 'planning.telemetry.schema', status: 'ok' },
      ],
    });
    expect(dbMock.select).toHaveBeenCalledTimes(6);
  });

  it('returns an error payload when a planning schema probe fails', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain(new Error('relation "iot.sensor_devices" does not exist'))),
    };

    const service = new HealthService(dbMock as never);
    const result = await service.checkDatabase();

    expect(result.status).toBe('error');
    expect(result.message).toContain('planning.telemetry.schema');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'planning.telemetry.schema',
          status: 'error',
          message: 'relation "iot.sensor_devices" does not exist',
        }),
      ]),
    );
    expect(dbMock.select).toHaveBeenCalledTimes(6);
  });
});

