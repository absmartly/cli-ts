import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCommand } from './update.js';
import { getAPIClientFromOptions, getGlobalOptions } from '../../lib/utils/api-helper.js';
import { parseExperimentFile } from '../../lib/template/parser.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn() };
});
vi.mock('../../lib/template/parser.js');

describe('update command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    updateExperiment: vi.fn().mockResolvedValue({ id: 42 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(updateCommand);
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

  it('should update display name', async () => {
    await updateCommand.parseAsync(['node', 'test', '42', '--display-name', 'New Name']);

    expect(mockClient.updateExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ display_name: 'New Name' })
    );
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Experiment 42 updated');
  });

  it('should update traffic percentage', async () => {
    await updateCommand.parseAsync(['node', 'test', '42', '--traffic', '50']);

    expect(mockClient.updateExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ percentage_of_traffic: 50 })
    );
  });

  it('should update from template file', async () => {
    vi.mocked(parseExperimentFile).mockReturnValue({
      display_name: 'Template Name',
      percentage_of_traffic: 75,
      state: 'running',
    });

    await updateCommand.parseAsync(['node', 'test', '42', '--from-file', 'template.md']);

    expect(mockClient.updateExperiment).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        display_name: 'Template Name',
        percentage_of_traffic: 75,
        state: 'running',
      })
    );
  });

  it('should error when no update fields provided', async () => {
    try {
      await updateCommand.parseAsync(['node', 'test', '42']);
      throw new Error('Should have thrown');
    } catch (error) {
      if ((error as Error).message.startsWith('process.exit')) {
        const output = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(output).toContain('At least one');
      } else {
        throw error;
      }
    }
  });
});
