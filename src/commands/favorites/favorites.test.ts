import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { favoritesCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('favorites command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    favoriteExperiment: vi.fn(),
    favoriteMetric: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(favoritesCommand);
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

  it('should add experiment to favorites', async () => {
    mockClient.favoriteExperiment.mockResolvedValue(undefined);
    await favoritesCommand.parseAsync(['node', 'test', 'add', 'experiment', '42']);
    expect(mockClient.favoriteExperiment).toHaveBeenCalledWith(42, true);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Added experiment 42 to favorites');
  });

  it('should add metric to favorites', async () => {
    mockClient.favoriteMetric.mockResolvedValue(undefined);
    await favoritesCommand.parseAsync(['node', 'test', 'add', 'metric', '10']);
    expect(mockClient.favoriteMetric).toHaveBeenCalledWith(10, true);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Added metric 10 to favorites');
  });

  it('should remove experiment from favorites', async () => {
    mockClient.favoriteExperiment.mockResolvedValue(undefined);
    await favoritesCommand.parseAsync(['node', 'test', 'remove', 'experiment', '42']);
    expect(mockClient.favoriteExperiment).toHaveBeenCalledWith(42, false);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Removed experiment 42 from favorites');
  });

  it('should remove metric from favorites', async () => {
    mockClient.favoriteMetric.mockResolvedValue(undefined);
    await favoritesCommand.parseAsync(['node', 'test', 'remove', 'metric', '10']);
    expect(mockClient.favoriteMetric).toHaveBeenCalledWith(10, false);
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Removed metric 10 from favorites');
  });

  it('should reject invalid type', async () => {
    await expect(
      favoritesCommand.parseAsync(['node', 'test', 'add', 'segment', '1'])
    ).rejects.toThrow();
  });
});
