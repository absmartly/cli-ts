import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AxiosHttpClient } from './axios-adapter.js';

const BASE_URL = 'https://show-request-test.absmartly.com/v1';

const mswServer = setupServer();

function captureStderr(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const original = process.stderr.write.bind(process.stderr);
  const spy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      calls.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });
  return {
    calls,
    restore: () => {
      spy.mockRestore();
      // Sanity: in case future test logic still references original.
      void original;
    },
  };
}

describe('AxiosHttpClient request/response logging', () => {
  beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
  afterAll(() => mswServer.close());
  afterEach(() => mswServer.resetHandlers());

  describe('showRequest', () => {
    it('writes a formatted HTTP request block to stderr', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/experiments`, () => HttpResponse.json({ id: 1 }, { status: 201 }))
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'secret-key', { showRequest: true });
        await client.request({
          method: 'POST',
          url: '/experiments',
          data: { name: 'my-exp' },
        });

        const out = stderr.calls.join('');
        expect(out).toContain('→ POST');
        expect(out).toContain(`${BASE_URL}/experiments`);
        expect(out).toContain('"name": "my-exp"');
      } finally {
        stderr.restore();
      }
    });

    it('redacts Authorization by default', async () => {
      mswServer.use(http.get(`${BASE_URL}/ping`, () => HttpResponse.json({ ok: true })));

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'super-secret-token-xyz', {
          showRequest: true,
        });
        await client.request({ method: 'GET', url: '/ping' });

        const out = stderr.calls.join('');
        expect(out).toContain('Authorization: Api-Key ***');
        expect(out).not.toContain('super-secret-token-xyz');
      } finally {
        stderr.restore();
      }
    });

    it('reveals Authorization when showSecrets is true', async () => {
      mswServer.use(http.get(`${BASE_URL}/ping`, () => HttpResponse.json({ ok: true })));

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'super-secret-token-xyz', {
          showRequest: true,
          showSecrets: true,
        });
        await client.request({ method: 'GET', url: '/ping' });

        const out = stderr.calls.join('');
        expect(out).toContain('Authorization: Api-Key super-secret-token-xyz');
      } finally {
        stderr.restore();
      }
    });
  });

  describe('curl', () => {
    it('writes a curl command to stderr', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/experiments`, () => HttpResponse.json({ id: 1 }, { status: 201 }))
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok', { curl: true });
        await client.request({
          method: 'POST',
          url: '/experiments',
          data: { name: 'x' },
        });

        const out = stderr.calls.join('');
        expect(out).toContain('$ curl -X POST');
        expect(out).toContain(`'${BASE_URL}/experiments'`);
        expect(out).toContain(`-d '{"name":"x"}'`);
      } finally {
        stderr.restore();
      }
    });

    it('emits both formats when showRequest and curl are both set', async () => {
      mswServer.use(
        http.post(`${BASE_URL}/experiments`, () => HttpResponse.json({ id: 1 }, { status: 201 }))
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok', {
          showRequest: true,
          curl: true,
        });
        await client.request({
          method: 'POST',
          url: '/experiments',
          data: { name: 'x' },
        });

        const out = stderr.calls.join('');
        expect(out).toContain('→ POST');
        expect(out).toContain('$ curl -X POST');
      } finally {
        stderr.restore();
      }
    });
  });

  describe('showResponse', () => {
    it('writes a successful response to stderr', async () => {
      mswServer.use(
        http.get(`${BASE_URL}/exp/42`, () =>
          HttpResponse.json({ id: 42, name: 'foo' }, { status: 200 })
        )
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok', { showResponse: true });
        await client.request({ method: 'GET', url: '/exp/42' });

        const out = stderr.calls.join('');
        expect(out).toContain('← 200');
        expect(out).toContain('"id": 42');
      } finally {
        stderr.restore();
      }
    });

    it('writes an error response to stderr (4xx) and still throws', async () => {
      mswServer.use(
        http.get(`${BASE_URL}/missing`, () =>
          HttpResponse.json({ error: 'not found' }, { status: 404 })
        )
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok', { showResponse: true });
        await expect(client.request({ method: 'GET', url: '/missing' })).rejects.toThrow();

        const out = stderr.calls.join('');
        expect(out).toContain('← 404');
        expect(out).toContain('not found');
      } finally {
        stderr.restore();
      }
    });
  });

  describe('retries', () => {
    it('fires the request logger on every retry attempt', async () => {
      let calls = 0;
      mswServer.use(
        http.get(`${BASE_URL}/flaky`, () => {
          calls++;
          if (calls < 3) {
            return HttpResponse.json({ error: 'oops' }, { status: 500 });
          }
          return HttpResponse.json({ ok: true });
        })
      );

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok', {
          showRequest: true,
          showResponse: true,
        });
        await client.request({ method: 'GET', url: '/flaky' });

        const out = stderr.calls.join('');
        const requestArrows = (out.match(/→ GET/g) ?? []).length;
        const responseArrows = (out.match(/← /g) ?? []).length;
        expect(requestArrows).toBe(3);
        expect(responseArrows).toBe(3);
      } finally {
        stderr.restore();
      }
    }, 30000);
  });

  describe('no flags', () => {
    it('writes nothing to stderr when no logging flags are set', async () => {
      mswServer.use(http.get(`${BASE_URL}/ping`, () => HttpResponse.json({ ok: true })));

      const stderr = captureStderr();
      try {
        const client = new AxiosHttpClient(BASE_URL, 'tok');
        await client.request({ method: 'GET', url: '/ping' });

        const out = stderr.calls.join('');
        expect(out).toBe('');
      } finally {
        stderr.restore();
      }
    });
  });
});
