import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import {
  alertRules,
  auditLogs,
  notificationDeliveries,
  notifications,
  systemSettings,
  type DatabaseClient,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

const DEFAULT_SETTINGS = {
  user_registration: true,
  default_user_role: 'citizen',
  session_timeout: 24 * 60 * 60 * 1000,
  audit_log_retention: 90,
  max_login_attempts: 5,
  password_min_length: 8,
  email_notifications: true,
  maintenance_mode: false,
  site_name: 'EcoTrack Platform',
  site_description: 'EcoTrack support and operations platform',
  timezone: 'UTC',
  date_format: 'MM/DD/YYYY',
  currency: 'USD',
  ecotrack_thresholds: {
    defaults: {
      residential: 80,
      commercial: 75,
      industrial: 70,
    },
    byZone: {},
  },
  notification_channels: [
    { id: 'ops-email', channel: 'email', recipient: 'ops@example.com', enabled: true },
    { id: 'oncall-sms', channel: 'sms', recipient: '+10000000000', enabled: false },
  ],
  notification_templates: {
    critical_alert: 'Critical alert: {{resource}} in {{zone}} requires immediate action.',
    warning_alert: 'Warning alert: {{resource}} is approaching threshold in {{zone}}.',
    info_alert: 'Info update: {{resource}} status changed in {{zone}}.',
  },
  severity_channel_routing: {
    critical: ['email', 'sms'],
    warning: ['email'],
    info: ['email'],
  },
  chatbot_contract_version: '1.0',
};

const SETTINGS_DESCRIPTIONS: Record<string, string> = {
  user_registration: 'Allow user self-registration',
  default_user_role: 'Default role for new users',
  session_timeout: 'Session timeout in milliseconds',
  audit_log_retention: 'Audit log retention in days',
  max_login_attempts: 'Maximum login attempts before lockout',
  password_min_length: 'Minimum password length',
  email_notifications: 'Email notifications enabled',
  maintenance_mode: 'Maintenance mode flag',
  site_name: 'Site name',
  site_description: 'Site description',
  timezone: 'Default timezone',
  date_format: 'Default date format',
  currency: 'Default currency',
  ecotrack_thresholds: 'EcoTrack fill-threshold configuration by container type and zone',
  notification_channels: 'Notification recipients and channels',
  notification_templates: 'Outbound communication templates',
  severity_channel_routing: 'Channel routing strategy by severity',
  chatbot_contract_version: 'Chatbot integration contract version',
};

const PUBLIC_KEYS = new Set([
  'site_name',
  'site_description',
  'timezone',
  'date_format',
  'currency',
  'chatbot_contract_version',
]);

@Injectable()
export class AdminSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getSettings() {
    await this.ensureDefaults();
    const rows = await this.db.select().from(systemSettings);

    const settings = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  async updateSettings(payload: Record<string, unknown>, actorId?: string | null) {
    const updates = this.normalizePayload(payload);
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No valid settings provided');
    }

    const now = new Date();

    await this.db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        await tx
          .insert(systemSettings)
          .values({
            key,
            value,
            description: SETTINGS_DESCRIPTIONS[key] ?? null,
            isPublic: PUBLIC_KEYS.has(key),
            updatedBy: actorId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: {
              value,
              updatedBy: actorId ?? null,
              updatedAt: now,
              description: SETTINGS_DESCRIPTIONS[key] ?? null,
              isPublic: PUBLIC_KEYS.has(key),
            },
          });
      }
    });

    return this.getSettings();
  }

  async dispatchTestNotification(
    payload: {
      severity: 'critical' | 'warning' | 'info';
      message: string;
      channel?: string;
      recipient?: string;
    },
    actorId?: string | null,
  ) {
    const settings = await this.getSettings();
    const channels = Array.isArray(settings.notification_channels)
      ? (settings.notification_channels as Array<Record<string, unknown>>)
      : [];
    const routing =
      settings.severity_channel_routing && typeof settings.severity_channel_routing === 'object'
        ? (settings.severity_channel_routing as Record<string, string[]>)
        : {};

    const routedChannels = payload.channel ? [payload.channel] : (routing[payload.severity] ?? ['email']);

    const [notification] = await this.db
      .insert(notifications)
      .values({
        eventType: `admin.test_notification.${payload.severity}`,
        entityType: 'admin_settings',
        entityId: 'test-notification',
        audienceScope: payload.recipient ? 'direct' : 'configured',
        title: `Test ${payload.severity} notification`,
        body: payload.message,
        preferredChannels: routedChannels,
        scheduledAt: new Date(),
        status: 'sent',
      })
      .returning();

    if (!notification) {
      throw new Error('Failed to create test notification');
    }

    const deliveries = [];
    for (const channel of routedChannels) {
      const configuredRecipient = channels.find(
        (entry) => entry.channel === channel && entry.enabled === true,
      )?.recipient;
      const recipientAddress = payload.recipient ?? (typeof configuredRecipient === 'string' ? configuredRecipient : '');
      const deliveryStatus = recipientAddress ? 'delivered' : 'failed';

      const [createdDelivery] = await this.db
        .insert(notificationDeliveries)
        .values({
          notificationId: notification.id,
          channel,
          recipientAddress: recipientAddress || `unconfigured:${channel}`,
          deliveryStatus,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          deliveredAt: deliveryStatus === 'delivered' ? new Date() : null,
          errorCode: deliveryStatus === 'failed' ? 'missing_recipient' : null,
        })
        .returning();

      deliveries.push({
        channel,
        recipient: recipientAddress || null,
        status: deliveryStatus,
        deliveryId: createdDelivery?.id ?? null,
      });
    }

    await this.db.insert(auditLogs).values({
      userId: actorId ?? null,
      action: 'communication_dispatched',
      resourceType: 'notifications',
      resourceId: notification.id,
      oldValues: null,
      newValues: {
        severity: payload.severity,
        message: payload.message,
        notificationId: notification.id,
        deliveries,
      },
    });

    return {
      notificationId: notification.id,
      severity: payload.severity,
      deliveries,
      status: deliveries.every((delivery) => delivery.status === 'delivered') ? 'ok' : 'partial',
    };
  }

  async listAlertRules() {
    return this.db.select().from(alertRules).orderBy(desc(alertRules.updatedAt));
  }

  async upsertAlertRule(
    payload: {
      id?: string;
      scopeType: string;
      scopeKey?: string | null;
      warningFillPercent?: number | null;
      criticalFillPercent?: number | null;
      anomalyTypeCode?: string | null;
      notifyChannels: string[];
      recipientRole?: string | null;
      isActive?: boolean;
    },
  ) {
    const normalizedScopeKey = payload.scopeKey?.trim() || null;
    const normalizedRecipientRole = payload.recipientRole?.trim() || null;
    const now = new Date();

    if (payload.id) {
      const [updatedRule] = await this.db
        .update(alertRules)
        .set({
          scopeType: payload.scopeType,
          scopeKey: normalizedScopeKey,
          warningFillPercent: payload.warningFillPercent ?? null,
          criticalFillPercent: payload.criticalFillPercent ?? null,
          anomalyTypeCode: payload.anomalyTypeCode?.trim() || null,
          notifyChannels: payload.notifyChannels,
          recipientRole: normalizedRecipientRole,
          isActive: payload.isActive ?? true,
          updatedAt: now,
        })
        .where(eq(alertRules.id, payload.id))
        .returning();

      if (!updatedRule) {
        throw new BadRequestException('Alert rule not found');
      }

      return updatedRule;
    }

    const candidates = await this.db
      .select()
      .from(alertRules)
      .where(eq(alertRules.scopeType, payload.scopeType));
    const matchingRule = candidates.find(
      (rule) =>
        (rule.scopeKey ?? null) === normalizedScopeKey &&
        (rule.recipientRole ?? null) === normalizedRecipientRole,
    );

    if (matchingRule) {
      const [updatedRule] = await this.db
        .update(alertRules)
        .set({
          warningFillPercent: payload.warningFillPercent ?? null,
          criticalFillPercent: payload.criticalFillPercent ?? null,
          anomalyTypeCode: payload.anomalyTypeCode?.trim() || null,
          notifyChannels: payload.notifyChannels,
          isActive: payload.isActive ?? true,
          updatedAt: now,
        })
        .where(eq(alertRules.id, matchingRule.id))
        .returning();

      if (!updatedRule) {
        throw new Error('Failed to update alert rule');
      }

      return updatedRule;
    }

    const [createdRule] = await this.db
      .insert(alertRules)
      .values({
        scopeType: payload.scopeType,
        scopeKey: normalizedScopeKey,
        warningFillPercent: payload.warningFillPercent ?? null,
        criticalFillPercent: payload.criticalFillPercent ?? null,
        anomalyTypeCode: payload.anomalyTypeCode?.trim() || null,
        notifyChannels: payload.notifyChannels,
        recipientRole: normalizedRecipientRole,
        isActive: payload.isActive ?? true,
      })
      .returning();

    if (!createdRule) {
      throw new Error('Failed to create alert rule');
    }

    return createdRule;
  }

  private normalizePayload(payload: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updates[key] = key === 'default_user_role' ? 'citizen' : payload[key];
      }
    }

    return updates;
  }

  private async ensureDefaults() {
    const rows = await this.db.select({ key: systemSettings.key }).from(systemSettings);
    const existingKeys = new Set(rows.map((row) => row.key));

    const now = new Date();
    const inserts = Object.entries(DEFAULT_SETTINGS)
      .filter(([key]) => !existingKeys.has(key))
      .map(([key, value]) => ({
        key,
        value,
        description: SETTINGS_DESCRIPTIONS[key] ?? null,
        isPublic: PUBLIC_KEYS.has(key),
        createdAt: now,
        updatedAt: now,
      }));

    if (inserts.length > 0) {
      await this.db.insert(systemSettings).values(inserts);
    }
  }
}

