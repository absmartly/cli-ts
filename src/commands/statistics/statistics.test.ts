import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statisticsCommand } from './index.js';
import { getAPIClientFromOptions, getGlobalOptions, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return { ...actual, getAPIClientFromOptions: vi.fn(), getGlobalOptions: vi.fn(), printFormatted: vi.fn() };
});

describe('statistics command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getPowerAnalysisMatrix: vi.fn().mockResolvedValue({ matrix: [[100, 200]] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(statisticsCommand);
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

  it('should calculate power analysis matrix', async () => {
    await statisticsCommand.parseAsync([
      'node', 'test', 'power-matrix',
      '--config', '{"split":[0.5,0.5],"metric_mean":100,"metric_variance":25,"metric_type":"count","powers":[0.8]}',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith({
      split: [0.5, 0.5],
      metric_mean: 100,
      metric_variance: 25,
      metric_type: 'count',
      powers: [0.8],
    });
    expect(printFormatted).toHaveBeenCalled();
  });
});
