import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsController } from '../modules/analytics/analytics.controller.js';
import { AnalyticsService } from '../modules/analytics/analytics.service.js';
import { GamificationController } from '../modules/gamification/gamification.controller.js';
import { GamificationService } from '../modules/gamification/gamification.service.js';
import { ContainersController } from '../modules/iot/containers.controller.js';
import { ContainersService } from '../modules/iot/containers.service.js';
import { CitizenReportsController } from '../modules/reports/citizen-reports.controller.js';
import { CitizenReportsService } from '../modules/reports/citizen-reports.service.js';
import { ZonesController } from '../modules/zones/zones.controller.js';
import { ZonesService } from '../modules/zones/zones.service.js';

describe('EcoTrack contract endpoints', () => {
  let app: INestApplication;

  const containersService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const zonesService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const reportsService = {
    list: vi.fn(),
    create: vi.fn(),
  };

  const gamificationService = {
    getLeaderboard: vi.fn(),
    upsertProfile: vi.fn(),
  };

  const analyticsService = {
    getSummary: vi.fn(),
    listZoneCurrentState: vi.fn(),
    listZoneAggregates: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ContainersController,
        ZonesController,
        CitizenReportsController,
        GamificationController,
        AnalyticsController,
      ],
      providers: [
        { provide: ContainersService, useValue: containersService },
        { provide: ZonesService, useValue: zonesService },
        { provide: CitizenReportsService, useValue: reportsService },
        { provide: GamificationService, useValue: gamificationService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    containersService.list.mockResolvedValue({ items: [], total: 0 });
    zonesService.list.mockResolvedValue({ items: [], total: 0 });
    reportsService.list.mockResolvedValue({ items: [], total: 0 });
    gamificationService.getLeaderboard.mockResolvedValue([]);
    analyticsService.getSummary.mockResolvedValue({
      containers: 0,
      zones: 0,
      tours: 0,
      citizenReports: 0,
      gamificationProfiles: 0,
    });
    analyticsService.listZoneCurrentState.mockResolvedValue([]);
    analyticsService.listZoneAggregates.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('normalizes container pagination and filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/containers')
      .query({ q: '  downtown ', status: ' available ', page: '0', pageSize: '200' })
      .expect(200);

    expect(containersService.list).toHaveBeenCalledWith({
      search: 'downtown',
      zoneId: undefined,
      status: 'available',
      limit: 100,
      offset: 0,
    });
    expect(response.body.pagination).toEqual({
      total: 0,
      page: 1,
      pageSize: 100,
      hasNext: false,
    });
  });

  it('normalizes zone pagination and active filter', async () => {
    await request(app.getHttpServer())
      .get('/api/zones')
      .query({ q: ' harbor ', isActive: 'false', page: '2', pageSize: '10' })
      .expect(200);

    expect(zonesService.list).toHaveBeenCalledWith({
      search: 'harbor',
      isActive: false,
      limit: 10,
      offset: 10,
    });
  });

  it('exposes gamification leaderboard with bounded limit', async () => {
    await request(app.getHttpServer())
      .get('/api/gamification/leaderboard')
      .query({ limit: '250' })
      .expect(200);

    expect(gamificationService.getLeaderboard).toHaveBeenCalledWith(100);
  });

  it('returns analytics summary', async () => {
    const response = await request(app.getHttpServer()).get('/api/analytics/summary').expect(200);

    expect(analyticsService.getSummary).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      containers: 0,
      zones: 0,
      tours: 0,
      citizenReports: 0,
      gamificationProfiles: 0,
    });
  });

  it('returns zone current-state analytics with normalized query parameters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/analytics/zones/current')
      .query({ zoneId: ' zone-1 ', limit: '25' })
      .expect(200);

    expect(analyticsService.listZoneCurrentState).toHaveBeenCalledWith({
      zoneId: 'zone-1',
      limit: 25,
    });
    expect(response.body).toEqual({
      zones: [],
    });
  });

  it('returns zone aggregate analytics with normalized query parameters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/analytics/zones/aggregates')
      .query({ zoneId: ' zone-2 ', limit: '60' })
      .expect(200);

    expect(analyticsService.listZoneAggregates).toHaveBeenCalledWith({
      zoneId: 'zone-2',
      limit: 60,
    });
    expect(response.body).toEqual({
      aggregates: [],
    });
  });
});

