import { Injectable } from '@nestjs/common';

import { CitizenRepository } from './citizen.repository.js';
import type { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';
import type { RegisterNotificationDeviceDto } from './dto/register-notification-device.dto.js';

@Injectable()
export class CitizenService {
  constructor(private readonly repository: CitizenRepository) {}

  async createReport(userId: string, dto: CreateCitizenReportDto) {
    const createdReport = await this.repository.createReport(userId, dto);

    if (createdReport.citizenNotificationId) {
      await this.dispatchPushNotification(createdReport.citizenNotificationId);
    }

    return createdReport;
  }

  async getProfile(userId: string) {
    return this.repository.getProfile(userId);
  }

  async getHistory(userId: string, limit: number, offset: number) {
    return this.repository.getHistory(userId, limit, offset);
  }

  async listChallenges(userId: string) {
    return this.repository.listChallenges(userId);
  }

  async enrollInChallenge(userId: string, challengeId: string) {
    return this.repository.enrollInChallenge(userId, challengeId);
  }

  async updateChallengeProgress(userId: string, challengeId: string, progressDelta: number) {
    return this.repository.updateChallengeProgress(userId, challengeId, progressDelta);
  }

  async registerNotificationDevice(userId: string, dto: RegisterNotificationDeviceDto) {
    return this.repository.registerNotificationDevice(userId, dto);
  }

  async listNotifications(userId: string, limit: number) {
    return this.repository.listUserNotifications(userId, limit);
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.repository.markUserNotificationRead(userId, notificationId);
  }

  private async dispatchPushNotification(notificationId: string) {
    const deliveries = await this.repository.listQueuedPushDeliveries(notificationId);

    await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: delivery.pushToken,
              title: delivery.title,
              body: delivery.body,
              sound: 'default',
              data: {
                notificationId: delivery.notificationId,
                deepLink: delivery.deepLink,
                ...delivery.payload,
              },
            }),
          });

          const payload = (await response.json()) as
            | { data?: { status?: string; id?: string; message?: string; details?: { error?: string } } }
            | { data?: Array<{ status?: string; id?: string; message?: string; details?: { error?: string } }> };

          const deliveryResult = Array.isArray(payload.data) ? payload.data[0] : payload.data;
          if (response.ok && deliveryResult?.status === 'ok') {
            await this.repository.markPushDeliveryDelivered(
              delivery.deliveryId,
              deliveryResult.id ?? null,
            );
            return;
          }

          await this.repository.markPushDeliveryFailed(
            delivery.deliveryId,
            deliveryResult?.details?.error ?? deliveryResult?.message ?? `HTTP_${response.status}`,
          );
        } catch (error) {
          await this.repository.markPushDeliveryFailed(
            delivery.deliveryId,
            error instanceof Error ? error.message : 'dispatch_failed',
          );
        }
      }),
    );
  }
}

