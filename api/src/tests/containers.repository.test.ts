import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContainersRepository } from '../modules/iot/containers.repository.js';

const createJoinedLimitSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    leftJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
});

const createLimitSelectionChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    }),
  }),
});

describe('ContainersRepository', () => {
  const originalLegacyFallback = process.env.ALLOW_LEGACY_CONTAINER_SCHEMA_FALLBACK;

  afterEach(() => {
    if (originalLegacyFallback === undefined) {
      delete process.env.ALLOW_LEGACY_CONTAINER_SCHEMA_FALLBACK;
      return;
    }

    process.env.ALLOW_LEGACY_CONTAINER_SCHEMA_FALLBACK = originalLegacyFallback;
  });

  const createLegacyListDbMock = () => {
    const totalRows = [{ value: 1 }];
    const legacyRows = [
      {
        id: 'container-1',
        code: 'CTR-001',
        label: 'Main Square',
        status: 'available',
        fillLevelPercent: 42,
        warningFillPercent: 80,
        criticalFillPercent: 95,
      },
    ];
    const createOffset = (rows: unknown[] | Error) =>
      rows instanceof Error ? vi.fn().mockRejectedValue(rows) : vi.fn().mockResolvedValue(rows);
    const createListChain = (rows: unknown[] | Error) => ({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: createOffset(rows),
              }),
            }),
          }),
        }),
      }),
    });

    return {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue(totalRows),
        })
        .mockReturnValueOnce(createListChain(new Error('column core.containers.fill_rate_per_hour does not exist')))
        .mockReturnValueOnce(createListChain(legacyRows)),
    };
  };

  it('fails loudly when the live container schema is missing simulation columns by default', async () => {
    delete process.env.ALLOW_LEGACY_CONTAINER_SCHEMA_FALLBACK;
    const dbMock = createLegacyListDbMock();

    const repository = new ContainersRepository(dbMock as any);

    await expect(repository.list({ limit: 100, offset: 0 })).rejects.toThrow(
      'fill_rate_per_hour',
    );
  });

  it('uses legacy container list columns only when explicitly enabled', async () => {
    process.env.ALLOW_LEGACY_CONTAINER_SCHEMA_FALLBACK = 'true';
    const dbMock = createLegacyListDbMock();

    const repository = new ContainersRepository(dbMock as any);
    const result = await repository.list({ limit: 100, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'container-1',
        code: 'CTR-001',
        fillLevelPercent: 42,
        lastMeasuredFillLevelPercent: 42,
        status: 'available',
      }),
    ]);
  });

  it('records measurements, auto-registers sensors, and refreshes container status', async () => {
    const sensorUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const containerUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          createJoinedLimitSelectionChain([
            {
              id: 'container-1',
              containerTypeId: 'type-1',
              warningFillPercent: 80,
              criticalFillPercent: 95,
            },
          ]),
        )
        .mockReturnValueOnce(createLimitSelectionChain([]))
        .mockReturnValueOnce(createLimitSelectionChain([]))
        .mockReturnValueOnce(createLimitSelectionChain([])),
      insert: vi
        .fn()
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'sensor-1',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 101,
                containerId: 'container-1',
                fillLevelPercent: 82,
              },
            ]),
          }),
        }),
      update: vi
        .fn()
        .mockReturnValueOnce({
          set: sensorUpdateSet,
        })
        .mockReturnValueOnce({
          set: containerUpdateSet,
        }),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new ContainersRepository(dbMock as any);
    const result = await repository.recordMeasurement('container-1', {
      deviceUid: 'sensor-new',
      fillLevelPercent: 82,
      batteryPercent: 66,
      measurementQuality: 'valid',
    });

    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(containerUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        fillLevelPercent: 82,
        status: 'attention_required',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        measurement: expect.objectContaining({
          id: 101,
          containerId: 'container-1',
        }),
        telemetrySummary: expect.objectContaining({
          severity: 'warning',
          warningThreshold: 80,
        }),
      }),
    );
  });
});

