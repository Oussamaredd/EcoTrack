import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CitizenRepository } from '../modules/citizen/citizen.repository.js';

const buildContainerLookup = () => [
  {
    id: 'container-1',
    code: 'CTR-1002',
    label: '17 RUE CROIX DES PETITS CHAMPS - Trilib',
    latitude: '48.863444',
    longitude: '2.339586',
    zoneId: 'zone-louvre',
  },
];

const createTransactionMock = () => {
  const insertedReports: Array<Record<string, unknown>> = [];
  const updatedProfiles: Array<Record<string, unknown>> = [];
  const insertedAlerts: Array<Record<string, unknown>> = [];
  const insertedNotifications: Array<Record<string, unknown>> = [];
  const insertedDeliveries: Array<Record<string, unknown>> = [];
  const insertedRecipients: Array<Record<string, unknown>> = [];

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
                  reportedAt: new Date('2026-03-10T09:00:00.000Z'),
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

      if (table && typeof table === 'object' && 'triggeredAt' in (table as Record<string, unknown>)) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedAlerts.push(payload);
            return {
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'alert-1',
                  ...payload,
                },
              ]),
            };
          }),
        };
      }

      if (table && typeof table === 'object' && 'audienceScope' in (table as Record<string, unknown>)) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedNotifications.push(payload);
            return {
              returning: vi.fn().mockResolvedValue([
                {
                  id: `notification-${insertedNotifications.length}`,
                  ...payload,
                },
              ]),
            };
          }),
        };
      }

      if (table && typeof table === 'object' && 'deliveryChannel' in (table as Record<string, unknown>)) {
        return {
          values: vi.fn((payload: Record<string, unknown>) => {
            insertedRecipients.push(payload);
            return Promise.resolve();
          }),
        };
      }

      if (table && typeof table === 'object' && 'channel' in (table as Record<string, unknown>)) {
        return {
          values: vi.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
            insertedDeliveries.push(...(Array.isArray(payload) ? payload : [payload]));
            return Promise.resolve();
          }),
        };
      }

      throw new Error('Unexpected insert target');
    }),
    select: vi.fn().mockImplementation((selection?: Record<string, unknown>) => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(
          selection && typeof selection === 'object' && 'pushToken' in selection
            ? []
            : [{ value: 1 }],
        ),
      }),
    })),
    query: {
      gamificationProfiles: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };

  return {
    tx,
    insertedReports,
    updatedProfiles,
    insertedAlerts,
    insertedNotifications,
    insertedDeliveries,
    insertedRecipients,
  };
};

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
        reportType: 'container_full',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate report creation when the same user repeats the same issue inside the last hour', async () => {
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(buildContainerLookup()),
          }),
        }),
      }),
      query: {
        citizenReports: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'existing-report',
            reporterUserId: 'user-1',
            description: '[container_full] Existing report',
          }),
        },
      },
    };

    const repository = new CitizenRepository(dbMock as any);

    await expect(
      repository.createReport('user-1', {
        containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
        reportType: 'container_full',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('stores snapshots, queues manager notifications, and preserves report type metadata for a new issue', async () => {
    const {
      tx,
      insertedReports,
      updatedProfiles,
      insertedAlerts,
      insertedNotifications,
      insertedDeliveries,
      insertedRecipients,
    } = createTransactionMock();

    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(buildContainerLookup()),
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
      reportType: 'container_full',
      description: ' Overflow near school ',
      latitude: '48.863444',
      longitude: '2.339586',
      photoUrl: 'data:image/jpeg;base64,YWJj',
    });

    expect(insertedReports[0]).toEqual(
      expect.objectContaining({
        containerId: 'container-1',
        containerCodeSnapshot: 'CTR-1002',
        containerLabelSnapshot: '17 RUE CROIX DES PETITS CHAMPS - Trilib',
        description: '[container_full] Overflow near school',
        latitude: '48.863444',
        longitude: '2.339586',
        photoUrl: 'data:image/jpeg;base64,YWJj',
      }),
    );
    expect(updatedProfiles[0]).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        points: 10,
        badges: ['first_report'],
      }),
    );
    expect(insertedAlerts[0]).toEqual(
      expect.objectContaining({
        containerId: 'container-1',
        zoneId: 'zone-louvre',
        eventType: 'citizen_container_reported',
        severity: 'warning',
      }),
    );
    expect(insertedNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'citizen_container_reported',
          audienceScope: 'zone:zone-louvre:role:manager',
          title: 'Citizen report for CTR-1002',
        }),
        expect.objectContaining({
          eventType: 'citizen_container_full_confirmation',
          audienceScope: 'user:user-1',
          title: 'Report received for CTR-1002',
        }),
      ]),
    );
    expect(insertedDeliveries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'notification-1',
          recipientAddress: 'zone:zone-louvre:role:manager',
        }),
      ]),
    );
    expect(insertedRecipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: 'notification-2',
          userId: 'user-1',
        }),
      ]),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'report-1',
        confirmationState: 'submitted',
        reportType: 'container_full',
        description: 'Overflow near school',
        managerNotificationQueued: true,
      }),
    );
  });

  it('records corroboration without raising a second manager alert', async () => {
    const {
      tx,
      insertedAlerts,
      insertedNotifications,
      insertedDeliveries,
      insertedRecipients,
    } = createTransactionMock();

    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(buildContainerLookup()),
          }),
        }),
      }),
      query: {
        citizenReports: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'existing-report',
            reporterUserId: 'user-2',
            description: '[container_full] Existing report',
          }),
        },
      },
      transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
    };

    const repository = new CitizenRepository(dbMock as any);

    const result = await repository.createReport('user-1', {
      containerId: 'f7a67f92-f8f7-4104-97b3-9136310cb2dd',
      reportType: 'container_full',
      description: 'Same overflow observed again',
    });

    expect(insertedAlerts).toHaveLength(0);
    expect(insertedNotifications).toEqual([
      expect.objectContaining({
        eventType: 'citizen_report_confirmation',
        audienceScope: 'user:user-1',
        title: 'Confirmation received for CTR-1002',
      }),
    ]);
    expect(insertedDeliveries).toHaveLength(0);
    expect(insertedRecipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
        }),
      ]),
    );
    expect(result).toEqual(
      expect.objectContaining({
        confirmationState: 'confirmed_existing_issue',
        managerNotificationQueued: false,
        reportType: 'container_full',
      }),
    );
  });
});
