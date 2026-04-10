import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { createAPIClient } from './client.js';
import { server } from '../../test/mocks/server.js';
import { http, HttpResponse } from 'msw';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { fetchLiveMetadata, buildExperimentData } from '../../test/helpers/live-helpers.js';
import { createStatefulExperimentHandlers } from '../../test/helpers/stateful-handlers.js';
import type { ExperimentId } from './branded-types.js';

const BASE_URL = TEST_BASE_URL;

describe('APIClient', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  let expId: ExperimentId;

  const handlers = !isLiveMode ? createStatefulExperimentHandlers(BASE_URL) : [];

  beforeAll(async () => {
    if (!isLiveMode) server.use(...handlers);
    const meta = await fetchLiveMetadata(client);
    const data = buildExperimentData(meta, '_client');
    const created = await client.createExperiment(data as any);
    expId = created.id as ExperimentId;
  });

  beforeEach(() => {
    if (!isLiveMode) server.use(...handlers);
  });

  afterAll(async () => {
    if (!expId) return;
    try {
      await client.archiveExperiment(expId);
    } catch {}
  });

  describe('listExperiments', () => {
    it('should return experiments array', async () => {
      const experiments = await client.listExperiments();

      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBeGreaterThan(0);
      for (const exp of experiments) {
        expect(exp).toHaveProperty('id');
        expect(typeof exp.id).toBe('number');
        expect(exp).toHaveProperty('name');
        expect(exp).toHaveProperty('state');
      }
    });

    it.skipIf(isLiveMode)('should handle empty results', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ experiments: [] });
        })
      );

      const experiments = await client.listExperiments({ items: 0 });

      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments).toHaveLength(0);
    });
  });

  describe('getExperiment', () => {
    it('should extract experiment from wrapped response with correct id', async () => {
      const experiment = await client.getExperiment(expId);

      expect(experiment.id).toBe(expId);
      expect(experiment).toHaveProperty('name');
      expect(experiment).toHaveProperty('state');
      expect(experiment).not.toHaveProperty('ok');
    });
  });

  describe('createExperiment', () => {
    it('should return unwrapped experiment with id and name', () => {
      expect(expId).toBeDefined();
      expect(typeof expId).toBe('number');
    });
  });

  describe('updateExperiment', () => {
    it('should send update and return unwrapped experiment with merged fields', async () => {
      const experiment = await client.updateExperiment(expId, { display_name: 'Updated Name' });

      expect(experiment.id).toBe(expId);
      expect(experiment.display_name).toBe('Updated Name');
      expect(experiment).not.toHaveProperty('ok');
    });
  });

  describe('error handling (live-compatible)', () => {
    it('should throw 404 for non-existent experiment', async () => {
      await expect(client.getExperiment(999999999)).rejects.toThrow(/Not found/);
    });

    it('should throw on invalid API key', async () => {
      if (!isLiveMode) {
        server.use(
          http.get(`${BASE_URL}/experiments`, ({ request }) => {
            const auth = request.headers.get('Authorization') ?? '';
            if (auth.includes('invalid-key')) {
              return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return HttpResponse.json({ experiments: [] });
          })
        );
      }
      const badClient = createAPIClient(BASE_URL, 'invalid-key-that-does-not-exist');
      await expect(badClient.listExperiments()).rejects.toThrow(/Unauthorized/);
    });
  });

  describe.skipIf(isLiveMode)('retry behavior', () => {
    let requestCount = 0;

    beforeEach(() => {
      requestCount = 0;
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it('should NOT retry POST requests on 5xx errors', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          requestCount++;
          return new HttpResponse(null, { status: 500 });
        })
      );

      const data = {
        name: 'test_experiment',
        display_name: 'Test Experiment',
        type: 'test' as const,
      };

      await expect(client.createExperiment(data)).rejects.toThrow();
      expect(requestCount).toBe(1);
    });

    it('should NOT retry POST requests on 503 errors', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          requestCount++;
          return new HttpResponse(null, { status: 503 });
        })
      );

      const data = {
        name: 'test_experiment',
        display_name: 'Test Experiment',
        type: 'test' as const,
      };

      await expect(client.createExperiment(data)).rejects.toThrow();
      expect(requestCount).toBe(1);
    });

    it('should retry GET requests on 5xx errors', async () => {
      let attemptCount = 0;
      server.use(
        http.get(`${BASE_URL}/experiments/:id`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 503 });
          }
          return HttpResponse.json({ experiment: { id: 123, name: 'test', state: 'running' } });
        })
      );

      const experiment = await client.getExperiment(123);
      expect(experiment.id).toBe(123);
      expect(experiment.name).toBe('test');
      expect(attemptCount).toBe(3);
    });

    it('should retry PUT requests on 5xx errors', async () => {
      let attemptCount = 0;
      server.use(
        http.put(`${BASE_URL}/experiments/:id`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json({
            ok: true,
            experiment: { id: 123, name: 'updated' },
            errors: [],
          });
        })
      );

      const experiment = await client.updateExperiment(123, { name: 'updated' });
      expect(experiment.id).toBe(123);
      expect(experiment.name).toBe('updated');
      expect(attemptCount).toBe(3);
    });

    it('should NOT retry PUT to /start on 5xx errors', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/:id/start`, () => {
          requestCount++;
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(client.startExperiment(123)).rejects.toThrow();
      expect(requestCount).toBe(1);
    });

    it('should NOT retry PUT to /stop on 5xx errors', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/:id/stop`, () => {
          requestCount++;
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(client.stopExperiment(123, 'other')).rejects.toThrow();
      expect(requestCount).toBe(1);
    });

    it('should NOT retry PUT to /restart on 5xx errors', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/:id/restart`, () => {
          requestCount++;
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(client.restartExperiment(123)).rejects.toThrow();
      expect(requestCount).toBe(1);
    });

    it('should retry DELETE requests on 5xx errors', async () => {
      let attemptCount = 0;
      server.use(
        http.delete(`${BASE_URL}/roles/:id`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return new HttpResponse(null, { status: 204 });
        })
      );

      await client.deleteRole(1);
      expect(attemptCount).toBeGreaterThan(1);
    });
  });

  describe.skipIf(isLiveMode)('validateOkResponse', () => {
    afterEach(() => {
      server.resetHandlers();
    });

    it('should throw on { ok: false } response with errors', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({
            ok: false,
            errors: ['name is required', 'unit_type is missing'],
          });
        })
      );

      try {
        await client.createExperiment({ name: '' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('createExperiment failed');
        expect(error.message).toContain('name is required');
        expect(error.message).toContain('unit_type is missing');
      }
    });

    it('should not throw on { ok: true } response', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({
            ok: true,
            experiment: { id: 1, name: 'test', state: 'draft' },
            errors: [],
          });
        })
      );

      const result = await client.createExperiment({ name: 'test' });
      expect(result.id).toBe(1);
    });
  });

  describe('rawRequest security - validation (no network)', () => {
    it('should reject absolute URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('https://evil.com/steal', 'GET')).rejects.toThrow(
        'Invalid API path: Absolute or protocol-relative URLs are not allowed'
      );
    });

    it('should reject http URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('http://evil.com/steal', 'POST')).rejects.toThrow(
        'Invalid API path: Absolute or protocol-relative URLs are not allowed'
      );
    });

    it('should reject file:// URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('file:///etc/passwd', 'GET')).rejects.toThrow(
        'Invalid API path: Absolute or protocol-relative URLs are not allowed'
      );
    });

    it('should reject protocol-relative URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('//evil.com/steal', 'GET')).rejects.toThrow(
        'Invalid API path: Absolute or protocol-relative URLs are not allowed'
      );
    });

    it('should reject paths without leading slash', async () => {
      await expect(client.rawRequest('experiments', 'GET')).rejects.toThrow(
        'Invalid API path: Must start with "/"'
      );
    });

    it('should reject path traversal with /../', async () => {
      await expect(client.rawRequest('/api/../admin', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject path traversal ending with /..', async () => {
      await expect(client.rawRequest('/api/..', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject path with /./', async () => {
      await expect(client.rawRequest('/api/./endpoint', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject URL-encoded path traversal (/%2e%2e/)', async () => {
      await expect(client.rawRequest('/%2e%2e/admin', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject URL-encoded path traversal (/..%2f)', async () => {
      await expect(client.rawRequest('/api/..%2fadmin', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject URL-encoded current directory (/%2e/)', async () => {
      await expect(client.rawRequest('/%2e/endpoint', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });

    it('should reject path that is exactly /.. after decoding', async () => {
      await expect(client.rawRequest('/%2e%2e', 'GET')).rejects.toThrow(
        'Invalid API path: Path traversal sequences'
      );
    });
  });

  describe.skipIf(isLiveMode)('rawRequest security - network tests', () => {
    it('should accept valid relative paths', async () => {
      server.use(
        http.get(`${BASE_URL}/custom/endpoint`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.rawRequest('/custom/endpoint', 'GET');
      expect(result).toEqual({ success: true });
    });

    it('should accept URL-encoded regular characters', async () => {
      server.use(
        http.get(`${BASE_URL}/custom%20path`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.rawRequest('/custom%20path', 'GET');
      expect(result).toEqual({ success: true });
    });
  });
});
