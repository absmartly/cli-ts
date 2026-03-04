import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments restart command', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  it('should send PUT to /experiments/:id/restart', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put(`${BASE_URL}/experiments/:id/restart`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'running' },
          experiment_note: { id: 1, text: 'Restarted' },
          errors: [],
        });
      })
    );

    await client.restartExperiment(42 as any, { note: 'Restarting experiment' });

    expect(receivedBody).toEqual({ note: 'Restarting experiment' });
  });

  it('should send optional fields when provided', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put(`${BASE_URL}/experiments/:id/restart`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'development' },
          experiment_note: { id: 1, text: '' },
          errors: [],
        });
      })
    );

    await client.restartExperiment(42 as any, {
      note: 'Restarting',
      reason: 'testing',
      reshuffle: true,
      state: 'development',
    });

    expect(receivedBody).toEqual({
      note: 'Restarting',
      reason: 'testing',
      reshuffle: true,
      state: 'development',
    });
  });
});
