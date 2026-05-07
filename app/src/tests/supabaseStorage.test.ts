import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ACCESS_TOKEN_STORAGE_KEY } from '../services/authToken';
import {
  SUPABASE_BROWSER_AUTH_STORAGE_KEY,
  hasStoredSupabaseBrowserSession,
  migrateLegacySupabaseAuthStorage,
} from '../services/supabase';

const createSupabaseStorageSession = (suffix: string) =>
  JSON.stringify({
    access_token: `access-${suffix}`,
    refresh_token: `refresh-${suffix}`,
    expires_at: 1893456000,
    token_type: 'bearer',
    user: {
      id: `user-${suffix}`,
    },
  });

describe('Supabase auth storage migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test('uses an explicit production browser auth storage key', () => {
    expect(SUPABASE_BROWSER_AUTH_STORAGE_KEY).toBe('ecotrack.supabase.auth');
    expect(SUPABASE_BROWSER_AUTH_STORAGE_KEY).not.toBe('undefined');
    expect(SUPABASE_BROWSER_AUTH_STORAGE_KEY).not.toBe('token');
  });

  test('migrates a valid legacy undefined Supabase session and removes bad legacy keys', () => {
    const legacySession = createSupabaseStorageSession('legacy');
    window.localStorage.setItem('undefined', legacySession);
    window.localStorage.setItem('token', 'legacy-bearer-token');
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'api-bearer-token');

    const result = migrateLegacySupabaseAuthStorage(window.localStorage);

    expect(result.migratedFrom).toBe('undefined');
    expect(result.removedKeys).toEqual(['undefined', 'token']);
    expect(window.localStorage.getItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(legacySession);
    expect(window.localStorage.getItem('undefined')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('api-bearer-token');
  });

  test('migrates a valid legacy token Supabase session when no stable session exists', () => {
    const legacySession = createSupabaseStorageSession('token');
    window.localStorage.setItem('token', legacySession);

    const result = migrateLegacySupabaseAuthStorage(window.localStorage);

    expect(result.migratedFrom).toBe('token');
    expect(result.removedKeys).toEqual(['token']);
    expect(window.localStorage.getItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(legacySession);
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  test('preserves an existing stable Supabase session while cleaning legacy keys', () => {
    const stableSession = createSupabaseStorageSession('stable');
    const legacySession = createSupabaseStorageSession('legacy');
    window.localStorage.setItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY, stableSession);
    window.localStorage.setItem('undefined', legacySession);
    window.localStorage.setItem('token', legacySession);

    const result = migrateLegacySupabaseAuthStorage(window.localStorage);

    expect(result.migratedFrom).toBeNull();
    expect(result.removedKeys).toEqual(['undefined', 'token']);
    expect(window.localStorage.getItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(stableSession);
    expect(window.localStorage.getItem('undefined')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  test('detects whether a stable Supabase session exists for protected route bootstrapping', () => {
    expect(hasStoredSupabaseBrowserSession(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(false);

    window.localStorage.setItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY, 'not-json');
    expect(hasStoredSupabaseBrowserSession(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(false);

    window.localStorage.setItem(SUPABASE_BROWSER_AUTH_STORAGE_KEY, createSupabaseStorageSession('stable'));
    expect(hasStoredSupabaseBrowserSession(SUPABASE_BROWSER_AUTH_STORAGE_KEY)).toBe(true);
  });
});
