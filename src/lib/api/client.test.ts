import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAPIClient } from './client.js';
import { server } from '../../test/mocks/server.js';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://api.absmartly.com/v1';

describe('APIClient', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-api-key');

  describe('listExperiments', () => {
    it('should fetch experiments', async () => {
      const experiments = await client.listExperiments({ limit: 10 });

      expect(experiments).toBeDefined();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBe(10);
    });

    it('should handle empty results', async () => {
      const experiments = await client.listExperiments({ limit: 0 });

      expect(experiments).toBeDefined();
      expect(Array.isArray(experiments)).toBe(true);
    });
  });

  describe('getExperiment', () => {
    it('should fetch a single experiment', async () => {
      const experiment = await client.getExperiment(123);

      expect(experiment).toBeDefined();
      expect(experiment.id).toBe(123);
    });
  });

  describe('createExperiment', () => {
    it('should create an experiment', async () => {
      const data = {
        name: 'test_experiment',
        display_name: 'Test Experiment',
        type: 'test',
      };

      const experiment = await client.createExperiment(data);

      expect(experiment).toBeDefined();
      expect(experiment.name).toBe(data.name);
      expect(experiment.id).toBeDefined();
    });
  });

  describe('updateExperiment', () => {
    it('should update an experiment', async () => {
      const data = {
        display_name: 'Updated Name',
      };

      const experiment = await client.updateExperiment(123, data);

      expect(experiment).toBeDefined();
      expect(experiment.id).toBe(123);
    });
  });

  describe('deleteExperiment', () => {
    it('should delete an experiment', async () => {
      await expect(client.deleteExperiment(123)).resolves.not.toThrow();
    });
  });

  describe('retry behavior', () => {
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
          return HttpResponse.json({ id: 123, name: 'test' });
        })
      );

      const experiment = await client.getExperiment(123);
      expect(experiment).toBeDefined();
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should retry PUT requests on 5xx errors', async () => {
      let attemptCount = 0;
      server.use(
        http.put(`${BASE_URL}/experiments/:id`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return HttpResponse.json({ id: 123, name: 'updated' });
        })
      );

      const experiment = await client.updateExperiment(123, { name: 'updated' });
      expect(experiment).toBeDefined();
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should retry DELETE requests on 5xx errors', async () => {
      let attemptCount = 0;
      server.use(
        http.delete(`${BASE_URL}/experiments/:id`, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return new HttpResponse(null, { status: 500 });
          }
          return new HttpResponse(null, { status: 204 });
        })
      );

      await client.deleteExperiment(123);
      expect(attemptCount).toBeGreaterThan(1);
    });
  });

  describe('rawRequest security', () => {
    it('should reject absolute URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('https://evil.com/steal', 'GET')).rejects.toThrow(
        'Invalid API path: Absolute URLs are not allowed'
      );
    });

    it('should reject http URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('http://evil.com/steal', 'POST')).rejects.toThrow(
        'Invalid API path: Absolute URLs are not allowed'
      );
    });

    it('should reject file:// URLs (SSRF protection)', async () => {
      await expect(client.rawRequest('file:///etc/passwd', 'GET')).rejects.toThrow(
        'Invalid API path: Absolute URLs are not allowed'
      );
    });

    it('should reject paths without leading slash', async () => {
      await expect(client.rawRequest('experiments', 'GET')).rejects.toThrow(
        'Invalid API path: Must start with "/"'
      );
    });

    it('should accept valid relative paths', async () => {
      server.use(
        http.get(`${BASE_URL}/custom/endpoint`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.rawRequest('/custom/endpoint', 'GET');
      expect(result).toEqual({ success: true });
    });
  });
});
