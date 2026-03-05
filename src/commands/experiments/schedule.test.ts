import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { scheduleCommand } from './schedule.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments schedule API', () => {
  const client = createAPIClient(BASE_URL, TEST_API_KEY);

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

describe('schedule command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    createScheduledAction: vi.fn().mockResolvedValue({
      scheduled_action: { id: 10, action: 'start', scheduled_at: '2030-04-01T10:00:00.000Z' },
    }),
    deleteScheduledAction: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(scheduleCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('create', () => {
    it('should create scheduled action', async () => {
      await scheduleCommand.parseAsync([
        'node', 'test', 'create', '42',
        '--action', 'start',
        '--at', '2030-04-01T10:00:00Z',
      ]);

      expect(mockClient.createScheduledAction).toHaveBeenCalledWith(
        42, 'start', '2030-04-01T10:00:00.000Z', 'Scheduled via CLI', undefined
      );
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Scheduled "start"');
    });

    it('should reject invalid --action', async () => {
      try {
        await scheduleCommand.parseAsync([
          'node', 'test', 'create', '42',
          '--action', 'invalid',
          '--at', '2030-04-01T10:00:00Z',
        ]);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const output = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(output).toContain('Invalid action');
          expect(output).toContain('Valid actions');
        } else {
          throw error;
        }
      }
    });

    it('should reject invalid datetime', async () => {
      try {
        await scheduleCommand.parseAsync([
          'node', 'test', 'create', '42',
          '--action', 'start',
          '--at', 'not-a-date',
        ]);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const output = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(output).toContain('Invalid datetime');
        } else {
          throw error;
        }
      }
    });

    it('should reject past datetime', async () => {
      try {
        await scheduleCommand.parseAsync([
          'node', 'test', 'create', '42',
          '--action', 'start',
          '--at', '2020-01-01T00:00:00Z',
        ]);
        throw new Error('Should have thrown');
      } catch (error) {
        if ((error as Error).message.startsWith('process.exit')) {
          const output = consoleErrorSpy.mock.calls.flat().join(' ');
          expect(output).toContain('must be in the future');
        } else {
          throw error;
        }
      }
    });
  });

  describe('delete', () => {
    it('should delete scheduled action', async () => {
      await scheduleCommand.parseAsync(['node', 'test', 'delete', '42', '10']);

      expect(mockClient.deleteScheduledAction).toHaveBeenCalledWith(42, 10);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('deleted');
    });
  });
});
