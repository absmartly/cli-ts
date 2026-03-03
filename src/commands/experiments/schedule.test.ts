import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';

const BASE_URL = 'https://api.absmartly.com/v1';

describe('experiments schedule command', () => {
  const client = createAPIClient(BASE_URL, 'test-key');

  describe('createScheduledAction', () => {
    it('should POST scheduled action with required fields', async () => {
      let receivedBody: Record<string, unknown> | null = null;
      server.use(
        http.post(`${BASE_URL}/experiments/:id/scheduled_action`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            ok: true,
            scheduled_action: { id: 1, action: 'start', scheduled_at: '2026-04-01T10:00:00Z' },
            errors: [],
          });
        })
      );

      await client.createScheduledAction(
        42 as any,
        'start',
        '2026-04-01T10:00:00Z',
        'Schedule start for April'
      );

      expect(receivedBody).toEqual({
        action: 'start',
        scheduled_at: '2026-04-01T10:00:00Z',
        note: 'Schedule start for April',
      });
    });

    it('should include optional reason when provided', async () => {
      let receivedBody: Record<string, unknown> | null = null;
      server.use(
        http.post(`${BASE_URL}/experiments/:id/scheduled_action`, async ({ request }) => {
          receivedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            ok: true,
            scheduled_action: { id: 1, action: 'stop' },
            errors: [],
          });
        })
      );

      await client.createScheduledAction(
        42 as any,
        'stop',
        '2026-04-01T10:00:00Z',
        'Stopping experiment',
        'testing'
      );

      expect(receivedBody).toHaveProperty('reason', 'testing');
    });
  });

  describe('deleteScheduledAction', () => {
    it('should DELETE the scheduled action', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${BASE_URL}/experiments/:id/scheduled_action/:actionId`, () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        })
      );

      await client.deleteScheduledAction(42 as any, 5 as any);

      expect(deleteCalled).toBe(true);
    });
  });
});
