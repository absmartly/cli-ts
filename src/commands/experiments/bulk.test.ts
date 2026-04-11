import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkCommand } from './bulk.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

import { select, confirm } from '@inquirer/prompts';

function resetBulkCommands() {
  resetCommand(bulkCommand);
  for (const cmd of bulkCommand.commands) {
    resetCommand(cmd);
  }
}

describe('bulk command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getExperiment: vi.fn(),
    startExperiment: vi.fn().mockResolvedValue({ id: 1, state: 'running' }),
    stopExperiment: vi.fn().mockResolvedValue({ id: 1, state: 'stopped' }),
    archiveExperiment: vi.fn().mockResolvedValue(undefined),
    listExperiments: vi.fn().mockResolvedValue([]),
    developmentExperiment: vi.fn().mockResolvedValue({ id: 1, state: 'development' }),
    fullOnExperiment: vi.fn().mockResolvedValue({ id: 1, state: 'running' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetBulkCommands();
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    mockClient.getExperiment.mockImplementation((id: number) =>
      Promise.resolve({ id, name: `exp-${id}` })
    );
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

  describe('bulk start', () => {
    it('should start experiments by IDs with --yes', async () => {
      await bulkCommand.parseAsync(['node', 'test', 'start', '10', '20', '--yes']);

      expect(mockClient.startExperiment).toHaveBeenCalledWith(10, undefined);
      expect(mockClient.startExperiment).toHaveBeenCalledWith(20, undefined);
      expect(mockClient.startExperiment).toHaveBeenCalledTimes(2);
    });

    it('should pass --note to startExperiment', async () => {
      await bulkCommand.parseAsync(['node', 'test', 'start', '10', '--yes', '--note', 'bulk note']);

      expect(mockClient.startExperiment).toHaveBeenCalledWith(10, 'bulk note');
    });
  });

  describe('bulk stop', () => {
    it('should prompt for reason when not provided', async () => {
      vi.mocked(select).mockResolvedValue('testing');
      vi.mocked(confirm).mockResolvedValue(true);

      await bulkCommand.parseAsync(['node', 'test', 'stop', '10']);

      expect(select).toHaveBeenCalled();
      expect(mockClient.stopExperiment).toHaveBeenCalledWith(10, 'testing', undefined);
    });

    it('should use --reason flag when provided', async () => {
      await bulkCommand.parseAsync(['node', 'test', 'stop', '10', '--reason', 'other', '--yes']);

      expect(select).not.toHaveBeenCalled();
      expect(mockClient.stopExperiment).toHaveBeenCalledWith(10, 'other', undefined);
    });
  });

  describe('--dry-run', () => {
    it('should show summary without executing', async () => {
      await bulkCommand.parseAsync(['node', 'test', 'start', '10', '20', '--dry-run']);

      expect(mockClient.startExperiment).not.toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Dry run');
      expect(output).toContain('exp-10');
      expect(output).toContain('exp-20');
    });
  });

  describe('--yes', () => {
    it('should skip confirmation prompt', async () => {
      await bulkCommand.parseAsync(['node', 'test', 'archive', '10', '--yes']);

      expect(confirm).not.toHaveBeenCalled();
      expect(mockClient.archiveExperiment).toHaveBeenCalledWith(10, false, undefined);
    });

    it('should prompt for confirmation without --yes', async () => {
      vi.mocked(confirm).mockResolvedValue(true);

      await bulkCommand.parseAsync(['node', 'test', 'archive', '10']);

      expect(confirm).toHaveBeenCalled();
      expect(mockClient.archiveExperiment).toHaveBeenCalledWith(10, false, undefined);
    });

    it('should abort when confirmation is denied', async () => {
      vi.mocked(confirm).mockResolvedValue(false);

      await bulkCommand.parseAsync(['node', 'test', 'archive', '10']);

      expect(confirm).toHaveBeenCalled();
      expect(mockClient.archiveExperiment).not.toHaveBeenCalled();
    });
  });
});
