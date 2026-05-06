// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { resolveApiBase } from '../lib/apiBase';

describe('resolveApiBase', () => {
  it('honors an explicit loopback API origin instead of rewriting to the active page origin', () => {
    expect(
      resolveApiBase({
        configuredApiBase: 'http://127.0.0.1:4173',
        windowOrigin: 'http://127.0.0.1:4174',
      }),
    ).toBe('http://127.0.0.1:4173');
  });

  it('keeps explicit non-loopback api origins intact', () => {
    expect(
      resolveApiBase({
        configuredApiBase: 'https://api.ecotrack.example.com/api',
        windowOrigin: 'http://127.0.0.1:4174',
      }),
    ).toBe('https://api.ecotrack.example.com');
  });

  it('uses the active page origin when the edge proxy is enabled', () => {
    expect(
      resolveApiBase({
        configuredApiBase: 'https://api.ecotrack.example.com',
        edgeProxyEnabled: true,
        windowOrigin: 'http://127.0.0.1:4174',
      }),
    ).toBe('http://127.0.0.1:4174');
  });
});
