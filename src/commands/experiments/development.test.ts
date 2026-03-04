import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments development command', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  it('should send PUT with note to /experiments/:id/development', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    let receivedMethod = '';
    server.use(
      http.put(`${BASE_URL}/experiments/:id/development`, async ({ request }) => {
        receivedMethod = request.method;
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'development' },
          errors: [],
        });
      })
    );

    await client.developmentExperiment(42 as any, 'Starting development');

    expect(receivedMethod).toBe('PUT');
    expect(receivedBody).toEqual({ note: 'Starting development' });
  });

  it('should return experiment data from response', async () => {
    server.use(
      http.put(`${BASE_URL}/experiments/:id/development`, () => {
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'development', name: 'test_exp' },
          errors: [],
        });
      })
    );

    const result = await client.developmentExperiment(42 as any, 'test note');

    expect(result).toHaveProperty('id', 42);
    expect(result).toHaveProperty('state', 'development');
  });
});
