import { describe, expect, it } from 'vitest';

import { shouldCompressResponse } from '../modules/performance/response-compression.js';

describe('shouldCompressResponse', () => {
  it('skips compression for server-sent events', () => {
    expect(
      shouldCompressResponse({
        acceptHeader: 'text/event-stream',
        requestPath: '/api/planning/stream',
      }),
    ).toBe(false);
  });

  it('allows compression for regular api responses', () => {
    expect(
      shouldCompressResponse({
        acceptHeader: 'application/json',
        requestPath: '/api/dashboard',
      }),
    ).toBe(true);
  });
});
