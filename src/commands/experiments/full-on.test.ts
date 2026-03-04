import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments full-on command', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

  it('should send PUT with variant and note to /experiments/:id/full_on', async () => {
    let receivedBody: Record<string, unknown> | null = null;
    server.use(
      http.put(`${BASE_URL}/experiments/:id/full_on`, async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'full_on', full_on_variant: 1 },
          errors: [],
        });
      })
    );

    await client.fullOnExperiment(42 as any, 1, 'Setting full on variant 1');

    expect(receivedBody).toEqual({
      full_on_variant: 1,
      note: 'Setting full on variant 1',
    });
  });

  it('should return experiment data', async () => {
    server.use(
      http.put(`${BASE_URL}/experiments/:id/full_on`, () => {
        return HttpResponse.json({
          ok: true,
          experiment: { id: 42, state: 'full_on', full_on_variant: 2 },
          errors: [],
        });
      })
    );

    const result = await client.fullOnExperiment(42 as any, 2, 'test');

    expect(result).toHaveProperty('id', 42);
    expect(result).toHaveProperty('state', 'full_on');
  });
});
