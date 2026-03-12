import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetPasswordCommand } from './reset-password.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('reset-password command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resetUserPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(resetPasswordCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(printFormatted).mockImplementation(() => {});
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

  it('should reset user password', async () => {
    mockClient.resetUserPassword.mockResolvedValue(undefined);

    await resetPasswordCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.resetUserPassword).toHaveBeenCalledWith(42);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('42');
  });

  it('should reject invalid user ID', async () => {
    await expect(resetPasswordCommand.parseAsync(['node', 'test', 'abc'])).rejects.toThrow();
    expect(mockClient.resetUserPassword).not.toHaveBeenCalled();
  });
});
