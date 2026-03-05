import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server.js';
import { createAPIClient } from '../../lib/api/client.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { restartCommand } from './restart.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

const BASE_URL = TEST_BASE_URL;

describe.skipIf(isLiveMode)('experiments restart API', () => {
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

describe('restart command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    restartExperiment: vi.fn().mockResolvedValue({ id: 42, state: 'running' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(restartCommand);
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

  it('should restart with default options', async () => {
    await restartCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.restartExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ note: 'Restarted via CLI', state: 'running' })
    );
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment 42 restarted');
  });

  it('should pass custom --reason', async () => {
    await restartCommand.parseAsync(['node', 'test', '42', '--reason', 'other']);

    expect(mockClient.restartExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ reason: 'other' })
    );
  });

  it('should reject invalid --reason', async () => {
    try {
      await restartCommand.parseAsync(['node', 'test', '42', '--reason', 'bad_reason']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('Invalid reason');
        expect(output).toContain('Valid reasons');
      } else {
        throw error;
      }
    }
  });

  it('should pass --state development', async () => {
    await restartCommand.parseAsync(['node', 'test', '42', '--state', 'development']);

    expect(mockClient.restartExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ state: 'development' })
    );
  });

  it('should reject invalid --state', async () => {
    try {
      await restartCommand.parseAsync(['node', 'test', '42', '--state', 'bad_state']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('Invalid state');
        expect(output).toContain('Valid states: running, development');
      } else {
        throw error;
      }
    }
  });

  it('should pass --reshuffle flag', async () => {
    await restartCommand.parseAsync(['node', 'test', '42', '--reshuffle']);

    expect(mockClient.restartExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ reshuffle: true })
    );
  });
});
