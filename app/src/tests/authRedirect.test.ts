import { beforeEach, describe, expect, test } from 'vitest';

import {
  clearPendingAuthRedirect,
  resolveAuthRedirectTarget,
  resolveRequestedAuthRedirect,
  storePendingAuthRedirect,
} from '../services/authRedirect';

describe('auth redirect intent', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test('defaults fresh login attempts to the role hub', () => {
    expect(resolveRequestedAuthRedirect('')).toBe('/app');
    expect(resolveAuthRedirectTarget('')).toBe('/app');
  });

  test('keeps legitimate protected-route deep links from the next parameter', () => {
    expect(resolveRequestedAuthRedirect('?next=/app/support')).toBe('/app/support');
    expect(resolveRequestedAuthRedirect('?next=%2Fapp%2Ftickets%2F123%2Fdetails')).toBe(
      '/app/tickets/123/details',
    );
  });

  test('keeps oauth pending redirects until callback completion clears them', () => {
    storePendingAuthRedirect('/app/support');

    expect(resolveAuthRedirectTarget('')).toBe('/app/support');

    clearPendingAuthRedirect();
    expect(resolveAuthRedirectTarget('')).toBe('/app');
  });

  test('rejects unsafe external redirect values', () => {
    expect(resolveRequestedAuthRedirect('?next=https://example.com/app')).toBe('/app');
    expect(resolveRequestedAuthRedirect('?next=//example.com/app')).toBe('/app');
  });
});
