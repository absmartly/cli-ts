import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AxiosHttpClient, AuthConfig } from './axios-adapter.js';

const BASE_URL = 'https://oauth-refresh-test.local/v1';

const mswServer = setupServer();

describe('OAuth JWT auto-refresh interceptor', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => mswServer.close());

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mswServer.resetHandlers();
  });

  it('triggers onExpired on 401 and retries with the new token', async () => {
    const onExpired = vi.fn().mockResolvedValue({
      method: 'oauth-jwt',
      token: 'refreshed-token',
    } satisfies AuthConfig);

    let callCount = 0;
    mswServer.use(
      http.get(`${BASE_URL}/experiments`, ({ request }) => {
        callCount++;
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer expired-token') {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (auth === 'Bearer refreshed-token') {
          return HttpResponse.json({ experiments: [{ id: 1 }] });
        }
        return HttpResponse.json({ error: 'Unexpected auth' }, { status: 400 });
      })
    );

    const client = new AxiosHttpClient(BASE_URL, {
      method: 'oauth-jwt',
      token: 'expired-token',
      onExpired,
    });

    const response = await client.request({ method: 'GET', url: '/experiments' });

    expect(onExpired).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ experiments: [{ id: 1 }] });
    expect(callCount).toBe(2);
  });

  it('propagates a contextual error when onExpired throws', async () => {
    const onExpired = vi.fn().mockRejectedValue(new Error('refresh failed'));

    mswServer.use(
      http.get(`${BASE_URL}/experiments`, () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );

    const client = new AxiosHttpClient(BASE_URL, {
      method: 'oauth-jwt',
      token: 'expired-token',
      onExpired,
    });

    await expect(client.request({ method: 'GET', url: '/experiments' })).rejects.toThrow(
      /token refresh unsuccessful.*refresh failed/
    );

    await expect(client.request({ method: 'GET', url: '/experiments' })).rejects.toThrow(
      'abs auth login'
    );

    expect(onExpired).toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Token refresh failed: refresh failed')
    );
  });

  it('does not intercept non-401 errors', async () => {
    const onExpired = vi.fn();

    mswServer.use(
      http.get(`${BASE_URL}/experiments`, () => {
        return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
      })
    );

    const client = new AxiosHttpClient(BASE_URL, {
      method: 'oauth-jwt',
      token: 'valid-token',
      onExpired,
    });

    await expect(client.request({ method: 'GET', url: '/experiments' })).rejects.toThrow(
      'Forbidden'
    );

    expect(onExpired).not.toHaveBeenCalled();
  });

  it('does not wire up the interceptor for api-key auth', async () => {
    let callCount = 0;
    mswServer.use(
      http.get(`${BASE_URL}/experiments`, () => {
        callCount++;
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );

    const client = new AxiosHttpClient(BASE_URL, {
      method: 'api-key',
      apiKey: 'bad-key',
    });

    await expect(client.request({ method: 'GET', url: '/experiments' })).rejects.toThrow(
      'Unauthorized'
    );

    expect(callCount).toBe(1);
  });

  it('updates the default authorization header after successful refresh', async () => {
    const onExpired = vi.fn().mockResolvedValue({
      method: 'oauth-jwt',
      token: 'refreshed-token',
    } satisfies AuthConfig);

    let requestIndex = 0;
    mswServer.use(
      http.get(`${BASE_URL}/experiments`, () => {
        requestIndex++;
        if (requestIndex === 1) {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return HttpResponse.json({ experiments: [] });
      })
    );

    const client = new AxiosHttpClient(BASE_URL, {
      method: 'oauth-jwt',
      token: 'expired-token',
      onExpired,
    });

    const response = await client.request({ method: 'GET', url: '/experiments' });
    expect(response.status).toBe(200);
    expect(onExpired).toHaveBeenCalledOnce();
    expect(requestIndex).toBe(2);
  });
});
