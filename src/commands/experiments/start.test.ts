import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startCommand } from './start.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

describe('start command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    startExperiment: vi.fn().mockResolvedValue({ id: 42, state: 'running' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(startCommand);
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

  it('should start experiment by ID', async () => {
    await startCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.startExperiment).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment 42 started');
  });

  it('should reject invalid ID', async () => {
    await expect(startCommand.parseAsync(['node', 'test', 'abc']))
      .rejects.toThrow('must be a valid number');
  });
});
