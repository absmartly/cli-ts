import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { archiveCommand } from './archive.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

describe('archive command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    archiveExperiment: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(archiveCommand);
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

  it('should archive experiment', async () => {
    await archiveCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(42, undefined, undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('archived');
    expect(output).not.toContain('unarchived');
  });

  it('should unarchive with --unarchive flag', async () => {
    await archiveCommand.parseAsync(['node', 'test', '42', '--unarchive']);

    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(42, true, undefined);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('unarchived');
  });

  it('should pass --note to archiveExperiment', async () => {
    await archiveCommand.parseAsync(['node', 'test', '42', '--note', 'my note']);

    expect(mockClient.archiveExperiment).toHaveBeenCalledWith(42, undefined, 'my note');
  });
});
