import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CitizenRepository } from '../modules/citizen/citizen.repository.js';

describe('CitizenRepository', () => {
  it('rejects report creation when the container no longer exists', async () => {
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const repository = new CitizenRepository(dbMock as any);

    await expect(
      repository.createReport('user-1', {
        containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
        description: 'Overflow near school',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores container snapshots when creating a new report', async () => {
    const insertedReports: Array<Record<string, unknown>> = [];
    const updatedProfiles: Array<Record<string, unknown>> = [];

    const transactionSelectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 1 }]),
      }),
    });

    const tx = {
      insert: vi.fn().mockImplementation((table: unknown) => {
        if (table && typeof table === 'object' && 'reportedAt' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              insertedReports.push(payload);
              return {
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'report-1',
                    ...payload,
                  },
                ]),
              };
            }),
          };
        }

        if (table && typeof table === 'object' && 'challengeProgress' in (table as Record<string, unknown>)) {
          return {
            values: vi.fn((payload: Record<string, unknown>) => {
              updatedProfiles.push(payload);
              return {
                onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
              };
            }),
          };
        }

        throw new Error('Unexpected insert target');
      }),
      select: transactionSelectMock,
      query: {
        gamificationProfiles: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };

    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'container-1',
                code: 'CTR-1001',
                label: 'Main Square - Glass',
              },
            ]),
          }),
        }),
      }),
      query: {
        citizenReports: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new CitizenRepository(dbMock as any);

    const result = await repository.createReport('user-1', {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      description: ' Overflow near school ',
      latitude: '48.8566',
      longitude: '2.3522',
      photoUrl: 'https://example.com/overflow.jpg',
    });

    expect(insertedReports[0]).toEqual(
      expect.objectContaining({
        containerId: 'container-1',
        containerCodeSnapshot: 'CTR-1001',
        containerLabelSnapshot: 'Main Square - Glass',
        description: 'Overflow near school',
        latitude: '48.8566',
        longitude: '2.3522',
        photoUrl: 'https://example.com/overflow.jpg',
      }),
    );
    expect(updatedProfiles[0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        points: 10,
        badges: ['first_report'],
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'report-1',
        confirmationState: 'submitted',
      }),
    );
  });
});

