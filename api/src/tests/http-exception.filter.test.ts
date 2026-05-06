import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  it('does not write to responses that have already sent headers', () => {
    const filter = new HttpExceptionFilter();
    const loggerErrorSpy = vi
      .spyOn((filter as any).logger, 'error')
      .mockImplementation(() => undefined);
    const response = {
      headersSent: true,
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const request = {
      method: 'GET',
      originalUrl: '/api/planning/dashboard',
      url: '/api/planning/dashboard',
      headers: {},
      requestId: 'req-123',
      id: 'req-123',
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };

    filter.catch(new Error('boom'), host as any);

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"message":"GET /api/planning/dashboard 500 (req-123)"'),
      expect.stringContaining('Error: boom'),
    );
    expect(JSON.parse(loggerErrorSpy.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        error: 'boom',
        method: 'GET',
        path: '/api/planning/dashboard',
        requestId: 'req-123',
        statusCode: 500,
      }),
    );
  });
});

