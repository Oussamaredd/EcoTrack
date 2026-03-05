import { describe, expect, it, vi } from 'vitest';

import { AdminSettingsRepository } from '../modules/admin/admin.settings.repository.js';

describe('AdminSettingsRepository', () => {
  it('persists notification rows when dispatching a test notification', async () => {
    const valuesSpy = vi
      .fn()
      .mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'notification-1',
          },
        ]),
      })
      .mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'delivery-1',
          },
        ]),
      })
      .mockResolvedValueOnce(undefined);

    const dbMock = {
      insert: vi.fn().mockReturnValue({
        values: valuesSpy,
      }),
    };

    const repository = new AdminSettingsRepository(dbMock as any);
    vi.spyOn(repository, 'getSettings').mockResolvedValue({
      notification_channels: [{ channel: 'email', recipient: 'ops@example.com', enabled: true }],
      severity_channel_routing: { critical: ['email'] },
    } as any);

    const result = await repository.dispatchTestNotification(
      {
        severity: 'critical',
        message: 'Test alert',
      },
      'admin-1',
    );

    expect(dbMock.insert).toHaveBeenCalledTimes(3);
    expect(result).toEqual(
      expect.objectContaining({
        notificationId: 'notification-1',
        status: 'ok',
        deliveries: [
          expect.objectContaining({
            channel: 'email',
            recipient: 'ops@example.com',
            status: 'delivered',
          }),
        ],
      }),
    );
  });

  it('creates a new alert rule when no matching scope exists', async () => {
    const dbMock = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'rule-1',
              scopeType: 'global',
              scopeKey: null,
              notifyChannels: ['email'],
            },
          ]),
        }),
      }),
    };

    const repository = new AdminSettingsRepository(dbMock as any);

    const result = await repository.upsertAlertRule({
      scopeType: 'global',
      notifyChannels: ['email'],
      warningFillPercent: 80,
      criticalFillPercent: 95,
      isActive: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'rule-1',
        scopeType: 'global',
      }),
    );
  });

  it('normalizes default_user_role updates to citizen', async () => {
    const insertedSettings: Array<Record<string, unknown>> = [];
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn((payload: Record<string, unknown>) => {
          insertedSettings.push(payload);
          return {
            onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
          };
        }),
      }),
    };

    const dbMock = {
      transaction: vi.fn(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx)),
    };

    const repository = new AdminSettingsRepository(dbMock as any);
    vi.spyOn(repository, 'getSettings').mockResolvedValue({
      default_user_role: 'citizen',
    } as any);

    const updated = await repository.updateSettings(
      {
        default_user_role: 'super_admin',
      },
      'admin-1',
    );

    expect(insertedSettings[0]).toEqual(
      expect.objectContaining({
        key: 'default_user_role',
        value: 'citizen',
      }),
    );
    expect(updated).toEqual(
      expect.objectContaining({
        default_user_role: 'citizen',
      }),
    );
  });
});

