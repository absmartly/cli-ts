import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statisticsCommand } from './index.js';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  printFormatted,
} from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    printFormatted: vi.fn(),
  };
});

describe('statistics command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    getPowerAnalysisMatrix: vi.fn().mockResolvedValue({ matrix: [[0.9857], [0.8092], [0.7008]] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(statisticsCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table', noColor: true } as any);
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

  it('should calculate power analysis matrix with --config JSON', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"split":[0.5,0.5],"metric_mean":100,"metric_variance":25,"metric_type":"count","powers":[0.8],"sample_sizes":[2000,3000,4000]}',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith({
      split: [0.5, 0.5],
      metric_mean: 100,
      metric_variance: 25,
      metric_type: 'count',
      powers: [0.8],
      sample_sizes: [2000, 3000, 4000],
    });
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('Participants / Power');
    expect(output).toContain('80%');
    expect(output).toContain('98.57%');
    expect(output).toContain('80.92%');
    expect(output).toContain('70.08%');
  });

  it('should display time-based rows when participants_per_week is provided', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"sample_sizes":[2000,3000,4000],"powers":[0.8],"metric_mean":10,"metric_variance":10000,"metric_type":"goal_count","participants_per_week":1000}',
    ]);

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('Max runtime');
    expect(output).toContain('2w');
    expect(output).toContain('3w');
    expect(output).toContain('4w');
  });

  it('should format participant counts with K suffix', async () => {
    mockClient.getPowerAnalysisMatrix.mockResolvedValueOnce({ matrix: [[0.6268], [0.4432]] });

    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"sample_sizes":[5000,10000],"powers":[0.8],"metric_mean":10,"metric_variance":10000,"metric_type":"goal_count"}',
    ]);

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('5K');
    expect(output).toContain('10K');
    expect(output).toContain('62.68%');
    expect(output).toContain('44.32%');
  });

  it('should build config from individual CLI options', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--analysis-type',
      'group_sequential',
      '--metric-type',
      'goal_count',
      '--metric-mean',
      '10',
      '--metric-variance',
      '10000',
      '--alpha',
      '0.1',
      '--powers',
      '0.8',
      '--split',
      '0.5,0.5',
      '--sample-sizes',
      '2000,3000,4000',
      '--participants',
      '1000/week',
      '--two-sided',
      '--futility-type',
      'binding',
      '--first-analysis',
      '7d',
      '--min-analysis-interval',
      '1d',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith({
      analysis_type: 'group_sequential',
      metric_type: 'goal_count',
      metric_mean: 10,
      metric_variance: 10000,
      alpha: 0.1,
      powers: [0.8],
      split: [0.5, 0.5],
      sample_sizes: [2000, 3000, 4000],
      two_sided: true,
      participants_per_week: 1000,
      group_sequential_futility_type: 'binding',
      group_sequential_first_analysis_interval: '7d',
      group_sequential_min_analysis_interval: '1d',
    });
  });

  it('should convert daily participants to weekly', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--metric-type',
      'goal_count',
      '--metric-mean',
      '10',
      '--metric-variance',
      '10000',
      '--sample-sizes',
      '2000',
      '--participants',
      '500/day',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ participants_per_week: 3500 })
    );
  });

  it('should convert monthly participants to weekly', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--metric-type',
      'goal_count',
      '--metric-mean',
      '10',
      '--metric-variance',
      '10000',
      '--sample-sizes',
      '2000',
      '--participants',
      '30000/month',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ participants_per_week: 7000 })
    );
  });

  it('should default to weekly when no unit is specified', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--metric-type',
      'goal_count',
      '--metric-mean',
      '10',
      '--metric-variance',
      '10000',
      '--sample-sizes',
      '2000',
      '--participants',
      '1000',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ participants_per_week: 1000 })
    );
  });

  it('should accept short recurrence aliases', async () => {
    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--metric-type',
      'goal_count',
      '--metric-mean',
      '10',
      '--metric-variance',
      '10000',
      '--sample-sizes',
      '2000',
      '--participants',
      '500/d',
    ]);

    expect(mockClient.getPowerAnalysisMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ participants_per_week: 3500 })
    );
  });

  it('should error when required options are missing without --config', async () => {
    await expect(
      statisticsCommand.parseAsync(['node', 'test', 'power-matrix', '--metric-type', 'goal_count'])
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('--metric-type, --metric-mean, and --metric-variance')
    );
  });

  it('should error when neither sample-sizes nor MDEs are provided', async () => {
    await expect(
      statisticsCommand.parseAsync([
        'node',
        'test',
        'power-matrix',
        '--metric-type',
        'goal_count',
        '--metric-mean',
        '10',
        '--metric-variance',
        '10000',
      ])
    ).rejects.toThrow('process.exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('--sample-sizes or --minimum-detectable-effects')
    );
  });

  it('should output raw JSON when --output json is used', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'json', noColor: true } as any);

    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"sample_sizes":[2000],"powers":[0.8],"metric_mean":10,"metric_variance":10000,"metric_type":"goal_count"}',
    ]);

    expect(printFormatted).toHaveBeenCalledWith(
      { matrix: [[0.9857], [0.8092], [0.7008]] },
      expect.objectContaining({ output: 'json' })
    );
  });

  it('should handle multiple power columns', async () => {
    mockClient.getPowerAnalysisMatrix.mockResolvedValueOnce({
      matrix: [
        [0.95, 0.8],
        [0.7, 0.5],
      ],
    });

    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"sample_sizes":[2000,3000],"powers":[0.8,0.9],"metric_mean":10,"metric_variance":10000,"metric_type":"goal_count"}',
    ]);

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('80%');
    expect(output).toContain('90%');
    expect(output).toContain('95.00%');
    expect(output).toContain('50.00%');
  });

  it('should handle MDE-based input', async () => {
    mockClient.getPowerAnalysisMatrix.mockResolvedValueOnce({
      matrix: [[0.85], [0.92]],
    });

    await statisticsCommand.parseAsync([
      'node',
      'test',
      'power-matrix',
      '--config',
      '{"minimum_detectable_effects":[0.05,0.10],"powers":[0.8],"metric_mean":10,"metric_variance":10000,"metric_type":"goal_count"}',
    ]);

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('MDE / Power');
    expect(output).toContain('5.00%');
    expect(output).toContain('10.00%');
    expect(output).toContain('85.00%');
    expect(output).toContain('92.00%');
  });
});
