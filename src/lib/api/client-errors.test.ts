import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse, passthrough } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from './client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('APIClient - Error Handling', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  describe('HTTP Error Codes', () => {
    it('should handle 401 unauthorized with clear message', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      try {
        await client.listExperiments();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(401);
        expect(error.message).toContain('Unauthorized: Invalid or expired API key');
        expect(error.message).toContain('Endpoint: GET /experiments');
        expect(error.message).toContain('abs auth login');
      }
    });

    it('should handle 403 forbidden with clear message', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
        })
      );

      try {
        await client.listExperiments();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('Forbidden: Insufficient permissions');
        expect(error.message).toContain('Endpoint: GET /experiments');
        expect(error.message).toContain('required permissions');
      }
    });

    it('should handle 404 not found', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments/999999`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      try {
        await client.getExperiment(999999);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('Not found: Resource does not exist');
        expect(error.message).toContain('Endpoint: GET /experiments/999999');
      }
    });

    it('should handle 500 server error', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        })
      );

      await expect(client.listExperiments()).rejects.toThrow();
    });

    it('should handle 502 bad gateway', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ error: 'Bad Gateway' }, { status: 502 });
        })
      );

      await expect(client.listExperiments()).rejects.toThrow();
    });

    it('should handle 503 service unavailable', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 });
        })
      );

      await expect(client.listExperiments()).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry GET requests on 500 errors', async () => {
      let attempts = 0;
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          attempts++;
          if (attempts < 3) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json({ experiments: [] });
        })
      );

      const result = await client.listExperiments();
      expect(attempts).toBe(3);
      expect(result).toEqual([]);
    });

    it('should NOT retry POST requests on 500 errors to prevent duplication', async () => {
      let attempts = 0;
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          attempts++;
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      await expect(client.createExperiment({ name: 'test' })).rejects.toThrow();
      expect(attempts).toBe(1);
    });

    it('should retry PUT requests on 500 errors (idempotent)', async () => {
      let attempts = 0;
      server.use(
        http.put(`${BASE_URL}/experiments/123`, () => {
          attempts++;
          if (attempts < 2) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json({ ok: true, experiment: { id: 123, name: 'updated' }, errors: [] });
        })
      );

      const result = await client.updateExperiment(123, { display_name: 'Updated' });
      expect(attempts).toBe(2);
      expect(result.id).toBe(123);
    });

    it('should retry DELETE requests on 500 errors (idempotent)', async () => {
      let attempts = 0;
      server.use(
        http.delete(`${BASE_URL}/segments/123`, () => {
          attempts++;
          if (attempts < 2) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return new HttpResponse(null, { status: 204 });
        })
      );

      await client.deleteSegment(123);
      expect(attempts).toBe(2);
    });

    it('should NOT retry POST on 4xx errors', async () => {
      let attempts = 0;
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          attempts++;
          return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
        })
      );

      await expect(client.createExperiment({ name: 'test' })).rejects.toThrow();
      expect(attempts).toBe(1);
    });

    it('should retry on 5xx errors for GET requests', async () => {
      let attempts = 0;
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          attempts++;
          if (attempts < 2) {
            return new HttpResponse(null, { status: 503 });
          }
          return HttpResponse.json({ experiments: [] });
        })
      );

      const result = await client.listExperiments();
      expect(attempts).toBe(2);
      expect(result).toEqual([]);
    });

    it('should NOT retry PUT to non-idempotent paths on 500 errors', async () => {
      let callCount = 0;
      server.use(
        http.put(`${BASE_URL}/experiments/1/start`, () => {
          callCount++;
          return HttpResponse.json({}, { status: 500 });
        })
      );

      await expect(client.startExperiment(1)).rejects.toThrow();
      expect(callCount).toBe(1);
    });

    it('should retry GET requests on 429 rate limit', async () => {
      let attempts = 0;
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          attempts++;
          if (attempts < 2) {
            return HttpResponse.json({ error: 'Rate limit' }, { status: 429 });
          }
          return HttpResponse.json({ experiments: [] });
        })
      );

      const result = await client.listExperiments();
      expect(attempts).toBe(2);
      expect(result).toEqual([]);
    });
  });

  describe('Network Errors', () => {
    it('should provide friendly message on connection refused', async () => {
      server.use(
        http.all('http://localhost:1/*', () => passthrough())
      );
      const badClient = createAPIClient('http://localhost:1', 'key');
      await expect(badClient.listExperiments()).rejects.toThrow(/Cannot connect/);
    });
  });

  describe('Error Response Data', () => {
    it('should include response data in error', async () => {
      const errorData = { error: 'Validation failed', fields: ['name'] };
      server.use(
        http.post(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json(errorData, { status: 400 });
        })
      );

      try {
        await client.createExperiment({ name: '' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.response).toEqual(errorData);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle 429 rate limit error', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: { 'retry-after': '30' } }
          );
        })
      );

      try {
        await client.listExperiments();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
        expect(error.message).toContain('Rate limit exceeded');
      }
    });

    it('should handle 429 without retry-after header', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        })
      );

      try {
        await client.listExperiments();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
        expect(error.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Specific Method Error Handling', () => {
    it('should handle error in startExperiment', async () => {
      server.use(
        http.put(`${BASE_URL}/experiments/123/start`, () => {
          return HttpResponse.json({ error: 'Already running' }, { status: 400 });
        })
      );

      await expect(client.startExperiment(123)).rejects.toThrow();
    });

    it('should handle error in createGoal', async () => {
      server.use(
        http.post(`${BASE_URL}/goals`, () => {
          return HttpResponse.json({ error: 'Duplicate name' }, { status: 409 });
        })
      );

      await expect(client.createGoal({ name: 'duplicate' })).rejects.toThrow();
    });

    it('should handle error in deleteSegment', async () => {
      server.use(
        http.delete(`${BASE_URL}/segments/123`, () => {
          return HttpResponse.json({ error: 'In use' }, { status: 409 });
        })
      );

      await expect(client.deleteSegment(123)).rejects.toThrow();
    });
  });
});
