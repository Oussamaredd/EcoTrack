import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNING_REALTIME_CONFIG,
  DEFAULT_RUNTIME_FEATURE_FLAGS,
  loadPlanningRealtimeConfig,
  loadRuntimeFeatureFlags,
} from '../config/runtime-features.js';

describe('runtime-features', () => {
  it('falls back to defaults when planning realtime env vars are absent or invalid', () => {
    expect(
      loadPlanningRealtimeConfig({
        PLANNING_SSE_ENABLED: 'not-a-boolean',
        PLANNING_WEBSOCKET_ENABLED: undefined,
        PLANNING_REALTIME_INTERVAL_MS: '-5',
      }),
    ).toEqual(DEFAULT_PLANNING_REALTIME_CONFIG);
  });

  it('normalizes valid planning realtime env overrides', () => {
    expect(
      loadPlanningRealtimeConfig({
        PLANNING_SSE_ENABLED: 'true',
        PLANNING_WEBSOCKET_ENABLED: 'false',
        PLANNING_REALTIME_INTERVAL_MS: '25000',
      }),
    ).toEqual({
      sseEnabled: true,
      websocketEnabled: false,
      messageIntervalMs: 25000,
    });
  });

  it('falls back to defaults when runtime feature env vars are absent or invalid', () => {
    expect(
      loadRuntimeFeatureFlags({
        ADMIN_WORKSPACE_ENABLED: undefined,
        BILLING_ENABLED: 'invalid',
        CITIZEN_CHALLENGES_ENABLED: undefined,
        PLANNING_REPORTS_ENABLED: 'unexpected',
      }),
    ).toEqual(DEFAULT_RUNTIME_FEATURE_FLAGS);
  });

  it('normalizes valid runtime feature env overrides', () => {
    expect(
      loadRuntimeFeatureFlags({
        ADMIN_WORKSPACE_ENABLED: 'true',
        BILLING_ENABLED: 'true',
        CITIZEN_CHALLENGES_ENABLED: 'false',
        PLANNING_REPORTS_ENABLED: 'true',
      }),
    ).toEqual({
      adminWorkspaceEnabled: true,
      billingEnabled: true,
      citizenChallengesEnabled: false,
      planningReportsEnabled: true,
    });
  });
});
