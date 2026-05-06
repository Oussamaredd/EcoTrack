import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CitizenController } from '../modules/citizen/citizen.controller.js';

describe('Citizen profile and challenges controller contract', () => {
  const authUserId = '390ca84d-6d0f-4b55-a2d6-c38fb9834a57';
  const challengeId = 'ef7502ed-7620-471f-9865-31101595ad0a';
  const citizenRequest = {
    authUser: {
      id: authUserId,
      role: 'citizen',
      roles: [{ id: 'role-citizen', name: 'citizen' }],
    },
  };

  const citizenServiceMock = {
    createReport: vi.fn(),
    getProfile: vi.fn(),
    getHistory: vi.fn(),
    listChallenges: vi.fn(),
    enrollInChallenge: vi.fn(),
    updateChallengeProgress: vi.fn(),
  };

  const controller = new CitizenController(citizenServiceMock as any);

  beforeEach(() => {
    vi.clearAllMocks();
    citizenServiceMock.getProfile.mockResolvedValue({
      gamification: {
        points: 42,
        level: 2,
      },
    });
    citizenServiceMock.getHistory.mockResolvedValue({
      items: [{ id: 'history-1', description: 'Container full near school' }],
      total: 1,
    });
    citizenServiceMock.listChallenges.mockResolvedValue([
      {
        id: challengeId,
        title: 'Neighborhood Hero',
        enrollmentStatus: 'not_enrolled',
      },
    ]);
    citizenServiceMock.enrollInChallenge.mockResolvedValue({
      challengeId,
      enrollmentStatus: 'enrolled',
    });
    citizenServiceMock.updateChallengeProgress.mockResolvedValue({
      challengeId,
      progress: 3,
      completionPercent: 30,
    });
  });

  it('returns profile for authenticated citizen user id', async () => {
    const response = await controller.profile({
      ...citizenRequest,
    } as any);

    expect(citizenServiceMock.getProfile).toHaveBeenCalledWith(authUserId);
    expect(response).toEqual(
      expect.objectContaining({
        gamification: expect.objectContaining({
          points: 42,
        }),
      }),
    );
  });

  it('normalizes history pagination and wraps pagination metadata', async () => {
    const response = await controller.history(
      { ...citizenRequest } as any,
      '2',
      '8',
    );

    expect(citizenServiceMock.getHistory).toHaveBeenCalledWith(authUserId, 8, 8);
    expect(response.pagination).toEqual({
      total: 1,
      page: 2,
      pageSize: 8,
      hasNext: false,
    });
  });

  it('exposes citizen challenges and challenge actions', async () => {
    await controller.challenges({ ...citizenRequest } as any);
    expect(citizenServiceMock.listChallenges).toHaveBeenCalledWith(authUserId);

    await controller.enroll({ ...citizenRequest } as any, challengeId);
    expect(citizenServiceMock.enrollInChallenge).toHaveBeenCalledWith(authUserId, challengeId);

    await controller.progress(
      { ...citizenRequest } as any,
      challengeId,
      { progressDelta: 2 },
    );
    expect(citizenServiceMock.updateChallengeProgress).toHaveBeenCalledWith(authUserId, challengeId, 2);
  });

  it('rejects missing auth user context', async () => {
    await expect(controller.profile({ authUser: undefined } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects authenticated users without citizen access', async () => {
    await expect(
      controller.profile({
        authUser: {
          id: authUserId,
          role: 'agent',
          roles: [{ id: 'role-agent', name: 'agent' }],
        },
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});


