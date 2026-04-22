import { describe, expect, it, vi } from 'vitest';

import { HealthService } from '../modules/health/health.service.js';

const createSelectionChain = (error?: unknown) => {
  const chain: {
    from: ReturnType<typeof vi.fn>;
    innerJoin: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue([]);

  return chain;
};

describe('HealthService', () => {
  it('returns ok when the identity, ticketing, planning, and async schema dependencies are queryable', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain()),
    };
    const configServiceMock = {
      get: vi.fn().mockReturnValue(true),
    };

    const service = new HealthService(dbMock as never, configServiceMock as never);
    const result = await service.checkDatabase();

    expect(result).toEqual({
      status: 'ok',
      checks: [
        { name: 'ticketing.schema', status: 'ok' },
        { name: 'identity.schema', status: 'ok' },
        { name: 'planning.dashboard.schema', status: 'ok' },
        { name: 'planning.telemetry.schema', status: 'ok' },
        { name: 'integration.event-connectors.schema', status: 'ok' },
        { name: 'iot.ingestion.schema', status: 'ok' },
      ],
    });
    expect(dbMock.select).toHaveBeenCalledTimes(11);
  });

  it('returns an error payload when an identity schema probe fails', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain(new Error('column identity.users.zone_id does not exist')))
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain()),
    };
    const configServiceMock = {
      get: vi.fn().mockReturnValue(true),
    };

    const service = new HealthService(dbMock as never, configServiceMock as never);
    const result = await service.checkDatabase();

    expect(result.status).toBe('error');
    expect(result.message).toContain('identity.schema');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'identity.schema',
          status: 'error',
          message: 'column identity.users.zone_id does not exist',
        }),
      ]),
    );
    expect(dbMock.select).toHaveBeenCalledTimes(11);
  });

  it('skips IoT readiness checks when ingestion is disabled', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain()),
    };
    const configServiceMock = {
      get: vi.fn().mockReturnValue(false),
    };

    const service = new HealthService(dbMock as never, configServiceMock as never);
    const result = await service.checkDatabase();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ name: 'iot.ingestion.schema' })]),
    );
    expect(dbMock.select).toHaveBeenCalledTimes(9);
  });

  it('defaults IoT readiness checks to enabled and normalizes unknown database failures', async () => {
    const dbMock = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain())
        .mockReturnValueOnce(createSelectionChain('queue timeout')),
    };
    const configServiceMock = {
      get: vi.fn().mockReturnValue(undefined),
    };

    const service = new HealthService(dbMock as never, configServiceMock as never);
    const result = await service.checkDatabase();

    expect(result.status).toBe('error');
    expect(result.message).toContain('iot.ingestion.schema');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'iot.ingestion.schema',
          status: 'error',
          message: 'Unknown database error',
        }),
      ]),
    );
    expect(configServiceMock.get).toHaveBeenCalledWith('iotIngestion.IOT_INGESTION_ENABLED');
    expect(dbMock.select).toHaveBeenCalledTimes(11);
  });
});

