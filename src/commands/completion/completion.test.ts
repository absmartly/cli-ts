import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { completionCommand } from './index.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

describe('completion command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(completionCommand);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should output completion info for bash', async () => {
    try {
      await completionCommand.parseAsync(['node', 'test', 'bash']);
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Completion for bash');
  });

  it('should output completion info for zsh', async () => {
    try {
      await completionCommand.parseAsync(['node', 'test', 'zsh']);
    } catch (error) {
      if (!(error as Error).message.startsWith('process.exit')) throw error;
    }

    const output = consoleSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Completion for zsh');
  });
});
