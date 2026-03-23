import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventWorkflowController } from '../modules/admin/admin.event-workflow.controller.js';

describe('AdminEventWorkflowController', () => {
  const eventWorkflowServiceMock = {
    listReplayableStagedEvents: vi.fn(),
    replayStagedEvents: vi.fn(),
    listReplayableDeliveries: vi.fn(),
    replayDeliveries: vi.fn(),
  };

  let controller: AdminEventWorkflowController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AdminEventWorkflowController(eventWorkflowServiceMock as any);
  });

  it('returns replayable staged events through the admin API contract', async () => {
    eventWorkflowServiceMock.listReplayableStagedEvents.mockResolvedValueOnce([
      { id: '11111111-1111-4111-8111-111111111111' },
    ]);

    await expect(
      controller.listReplayableStagedEvents({
        status: 'failed',
        limit: 20,
      }),
    ).resolves.toEqual({
      data: [{ id: '11111111-1111-4111-8111-111111111111' }],
    });
  });

  it('forwards replay delivery requests with the admin actor id', async () => {
    eventWorkflowServiceMock.replayDeliveries.mockResolvedValueOnce({
      replayed: 1,
      deliveryIds: ['22222222-2222-4222-8222-222222222222'],
    });

    await expect(
      controller.replayDeliveries(
        {
          deliveryIds: ['22222222-2222-4222-8222-222222222222'],
          reason: 'operator replay',
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
        } as any,
      ),
    ).resolves.toEqual({
      data: {
        replayed: 1,
        deliveryIds: ['22222222-2222-4222-8222-222222222222'],
      },
    });

    expect(eventWorkflowServiceMock.replayDeliveries).toHaveBeenCalledWith(
      {
        deliveryIds: ['22222222-2222-4222-8222-222222222222'],
        reason: 'operator replay',
      },
      '33333333-3333-4333-8333-333333333333',
    );
  });

  it('rethrows bad replay requests and wraps unexpected controller failures', async () => {
    eventWorkflowServiceMock.replayStagedEvents.mockRejectedValueOnce(
      new BadRequestException('No staged events were eligible.'),
    );

    await expect(
      controller.replayStagedEvents(
        {
          eventIds: ['11111111-1111-4111-8111-111111111111'],
          reason: 'operator replay',
          allowRejectedReplay: false,
        },
        { id: '33333333-3333-4333-8333-333333333333' } as any,
      ),
    ).rejects.toThrow(BadRequestException);

    eventWorkflowServiceMock.listReplayableDeliveries.mockRejectedValueOnce(new Error('db offline'));

    await expect(
      controller.listReplayableDeliveries({
        status: 'failed',
        limit: 20,
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
