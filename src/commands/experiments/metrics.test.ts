import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricsCommand } from './metrics.js';
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

describe('experiments metrics', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockClient = {
    resolveExperimentId: vi.fn().mockImplementation((v: string) => Promise.resolve(Number(v))),
    getExperiment: vi.fn().mockResolvedValue({
      primary_metric_id: 1,
      primary_metric: { name: 'Conversions' },
      secondary_metrics: [{ metric_id: 2, type: 'secondary', metric: { name: 'Revenue' } }],
    }),
    addExperimentMetrics: vi.fn(),
    confirmMetricImpact: vi.fn(),
    excludeExperimentMetric: vi.fn(),
    includeExperimentMetric: vi.fn(),
    removeMetricImpact: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCommand(metricsCommand);
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

  describe('list', () => {
    it('should list metrics for an experiment', async () => {
      await metricsCommand.parseAsync(['node', 'test', 'list', '42']);

      expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
      expect(printFormatted).toHaveBeenCalledWith(
        [
          { id: 1, name: 'Conversions', type: 'primary', owners: '' },
          { id: 2, name: 'Revenue', type: 'secondary', owners: '' },
        ],
        expect.any(Object)
      );
    });
  });

  describe('add', () => {
    it('should add metrics to an experiment', async () => {
      mockClient.addExperimentMetrics.mockResolvedValue(undefined);

      await metricsCommand.parseAsync(['node', 'test', 'add', '42', '--metrics', '1,2,3']);

      expect(mockClient.addExperimentMetrics).toHaveBeenCalledWith(42, [1, 2, 3]);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Metrics added to experiment 42');
    });
  });

  describe('confirm-impact', () => {
    it('should confirm metric impact', async () => {
      mockClient.confirmMetricImpact.mockResolvedValue(undefined);

      await metricsCommand.parseAsync(['node', 'test', 'confirm-impact', '42', '10']);

      expect(mockClient.confirmMetricImpact).toHaveBeenCalledWith(42, 10);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Metric impact confirmed');
    });
  });

  describe('exclude', () => {
    it('should exclude a metric from an experiment', async () => {
      mockClient.excludeExperimentMetric.mockResolvedValue(undefined);

      await metricsCommand.parseAsync(['node', 'test', 'exclude', '42', '10']);

      expect(mockClient.excludeExperimentMetric).toHaveBeenCalledWith(42, 10);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Metric 10 excluded from experiment 42');
    });
  });

  describe('include', () => {
    it('should include a metric in an experiment', async () => {
      mockClient.includeExperimentMetric.mockResolvedValue(undefined);

      await metricsCommand.parseAsync(['node', 'test', 'include', '42', '10']);

      expect(mockClient.includeExperimentMetric).toHaveBeenCalledWith(42, 10);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Metric 10 included in experiment 42');
    });
  });

  describe('remove-impact', () => {
    it('should remove metric impact', async () => {
      mockClient.removeMetricImpact.mockResolvedValue(undefined);

      await metricsCommand.parseAsync(['node', 'test', 'remove-impact', '42', '10']);

      expect(mockClient.removeMetricImpact).toHaveBeenCalledWith(42, 10);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Metric impact removed');
    });
  });

  describe('results --cached', () => {
    it('should fetch cached previewer results', async () => {
      const cachedData = {
        columnNames: [
          'variant',
          'unit_count',
          'metric_1_impact',
          'metric_1_impact_ci_lower',
          'metric_1_impact_ci_upper',
          'metric_1_pvalue',
          'metric_1_mean',
          'metric_1',
          'metric_1_var',
          'metric_1_abs_impact',
          'metric_1_abs_impact_ci_lower',
          'metric_1_abs_impact_ci_upper',
        ],
        rows: [
          [0, 1000, null, null, null, null, 2.0, 500, 0.5, null, null, null],
          [1, 1000, 0.05, 0.01, 0.09, 0.02, 2.1, 520, 0.6, 0.1, 0.02, 0.18],
        ],
        snapshot_data: { updated_at: '2026-03-26T10:00:00Z' },
      };
      (mockClient as any).getExperimentMetricsCached = vi.fn().mockResolvedValue(cachedData);
      (mockClient as any).getExperiment = vi.fn().mockResolvedValue({
        primary_metric_id: 1,
        primary_metric: { name: 'Conversions', effect: 'positive' },
        secondary_metrics: [],
        variants: [
          { variant: 0, name: 'Control' },
          { variant: 1, name: 'Treatment' },
        ],
      });

      await metricsCommand.parseAsync(['node', 'test', 'results', '42', '--cached']);

      expect((mockClient as any).getExperimentMetricsCached).toHaveBeenCalledWith(42);
      expect(printFormatted).toHaveBeenCalled();
      const errOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errOutput).toContain('cached previewer results');
    });

    it('should show pending update request status', async () => {
      const cachedData = {
        columnNames: [
          'variant',
          'unit_count',
          'metric_1_impact',
          'metric_1_impact_ci_lower',
          'metric_1_impact_ci_upper',
          'metric_1_pvalue',
          'metric_1_mean',
          'metric_1',
          'metric_1_var',
          'metric_1_abs_impact',
          'metric_1_abs_impact_ci_lower',
          'metric_1_abs_impact_ci_upper',
        ],
        rows: [
          [0, 1000, null, null, null, null, 2.0, 500, 0.5, null, null, null],
          [1, 1000, 0.05, 0.01, 0.09, 0.02, 2.1, 520, 0.6, 0.1, 0.02, 0.18],
        ],
        pending_update_request: { status: 'pending' },
      };
      (mockClient as any).getExperimentMetricsCached = vi.fn().mockResolvedValue(cachedData);
      (mockClient as any).getExperiment = vi.fn().mockResolvedValue({
        primary_metric_id: 1,
        primary_metric: { name: 'Conversions', effect: 'positive' },
        secondary_metrics: [],
        variants: [
          { variant: 0, name: 'Control' },
          { variant: 1, name: 'Treatment' },
        ],
      });

      await metricsCommand.parseAsync(['node', 'test', 'results', '42', '--cached']);

      const errOutput = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errOutput).toContain('pending');
    });
  });
});
