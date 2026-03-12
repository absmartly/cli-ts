import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server.js';
import { createAPIClient } from '../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('APIClient core', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  afterEach(() => {
    server.resetHandlers();
  });

  describe('error status handling', () => {
    it('should throw with 401 unauthorized message', async () => {
      server.use(http.get(`${BASE_URL}/experiments`, () => new HttpResponse(null, { status: 401 })));
      await expect(client.listExperiments()).rejects.toThrow(/Unauthorized/);
    });

    it('should throw with 403 forbidden message', async () => {
      server.use(http.get(`${BASE_URL}/experiments`, () => new HttpResponse(null, { status: 403 })));
      await expect(client.listExperiments()).rejects.toThrow(/Forbidden/);
    });

    it('should throw with 404 not found message', async () => {
      server.use(http.get(`${BASE_URL}/experiments/999`, () => new HttpResponse(null, { status: 404 })));
      await expect(client.getExperiment(999)).rejects.toThrow(/Not found/);
    });

    it('should throw with 429 rate limit message', async () => {
      server.use(
        http.get(`${BASE_URL}/experiments`, () =>
          new HttpResponse(null, { status: 429, headers: { 'retry-after': '30' } })
        )
      );
      await expect(client.listExperiments()).rejects.toThrow(/Rate limit/);
    });

    it('should throw generic error for 500', async () => {
      server.use(http.get(`${BASE_URL}/roles`, () => new HttpResponse(null, { status: 500 })));
      await expect(client.listRoles()).rejects.toThrow(/API error/);
    });
  });

  describe('validateListResponse', () => {
    it('should throw when response is not an object', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json('not-an-object')));
      await expect(client.listGoals()).rejects.toThrow(/Expected object/);
    });

    it('should throw when expected key is missing', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json({ wrong_key: [] })));
      await expect(client.listGoals()).rejects.toThrow(/Missing "goals" field/);
    });

    it('should throw when expected key is not an array', async () => {
      server.use(http.get(`${BASE_URL}/goals`, () => HttpResponse.json({ goals: 'not-array' })));
      await expect(client.listGoals()).rejects.toThrow(/must be an array/);
    });
  });

  describe('validateEntityResponse', () => {
    it('should throw when response is not an object', async () => {
      server.use(http.get(`${BASE_URL}/goals/1`, () => HttpResponse.json('not-an-object')));
      await expect(client.getGoal(1)).rejects.toThrow(/Expected object/);
    });

    it('should throw when expected key is missing', async () => {
      server.use(http.get(`${BASE_URL}/goals/1`, () => HttpResponse.json({ wrong_key: {} })));
      await expect(client.getGoal(1)).rejects.toThrow(/Missing "goal" field/);
    });
  });

  describe('validateOkResponse', () => {
    it('should throw when ok is false with errors', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments/1/export_data`, () =>
          HttpResponse.json({ ok: false, errors: ['denied'] })
        )
      );
      await expect(client.exportExperimentData(1)).rejects.toThrow(/denied/);
    });

    it('should succeed when ok is true', async () => {
      server.use(
        http.post(`${BASE_URL}/experiments/1/export_data`, () =>
          HttpResponse.json({ ok: true, errors: [] })
        )
      );
      await expect(client.exportExperimentData(1)).resolves.toBeUndefined();
    });
  });
});
