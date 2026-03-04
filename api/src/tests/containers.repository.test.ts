import { describe, expect, it, vi } from 'vitest';

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

