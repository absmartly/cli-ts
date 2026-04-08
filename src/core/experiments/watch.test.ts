import { describe, it, expect, vi, beforeEach } from 'vitest';
import { watchExperimentTick } from './watch.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import * as metricResults from '../../api-client/metric-results.js';

vi.mock('../../api-client/metric-results.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api-client/metric-results.js')>();
  return {
    ...actual,
    extractMetricInfos: vi.fn(),
    extractVariantNames: vi.fn(),
    fetchAllMetricResults: vi.fn(),
    formatResultRows: vi.fn(),
  };
});

const id = (n: number) => n as ExperimentId;

describe('watchExperimentTick', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getExperiment: vi.fn().mockResolvedValue({
        display_name: 'My Experiment',
        name: 'my-experiment',
        state: 'running',
      }),
    };
  });

  it('returns hasMetrics: false when there are no metrics', async () => {
    vi.mocked(metricResults.extractMetricInfos).mockReturnValue([]);
    vi.mocked(metricResults.extractVariantNames).mockReturnValue(new Map());

    const result = await watchExperimentTick(mockClient as any, { experimentId: id(1) });

    expect(result.data.hasMetrics).toBe(false);
    expect(result.data.displayName).toBe('My Experiment');
    expect(result.data.state).toBe('running');
    expect(result.data.results).toEqual([]);
    expect(result.data.formattedRows).toEqual([]);
    expect(result.data.resultsJson).toBe('[]');
    expect(metricResults.fetchAllMetricResults).not.toHaveBeenCalled();
  });

  it('returns hasMetrics: true with formatted results when metrics exist', async () => {
    const metricInfos = [
      { id: 10, name: 'Conversion Rate', type: 'primary', effect: 'positive' },
    ];
    const variantNames = new Map([[0, 'Control'], [1, 'Treatment']]);
    const mockResults = [
      {
        metric_id: 10,
        name: 'Conversion Rate',
        type: 'primary',
        variants: [
          { variant: 0, unit_count: 100, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 0.1, count: 10, variance: 0.01, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
          { variant: 1, unit_count: 100, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09, pvalue: 0.03, mean: 0.15, count: 15, variance: 0.02, abs_impact: 0.05, abs_impact_lower: 0.01, abs_impact_upper: 0.09 },
        ],
      },
    ];
    const mockFormattedRow = { metric: 'Conversion Rate', type: 'primary', impact: '+5%', confidence: '97%', samples: '100' };

    vi.mocked(metricResults.extractMetricInfos).mockReturnValue(metricInfos as any);
    vi.mocked(metricResults.extractVariantNames).mockReturnValue(variantNames);
    vi.mocked(metricResults.fetchAllMetricResults).mockResolvedValue(mockResults as any);
    vi.mocked(metricResults.formatResultRows).mockReturnValue([mockFormattedRow]);

    const result = await watchExperimentTick(mockClient as any, { experimentId: id(1) });

    expect(result.data.hasMetrics).toBe(true);
    expect(result.data.displayName).toBe('My Experiment');
    expect(result.data.state).toBe('running');
    expect(result.data.results).toBe(mockResults);
    expect(result.data.formattedRows).toEqual([mockFormattedRow]);
    expect(result.data.resultsJson).toBe(JSON.stringify(mockResults));
    expect(metricResults.fetchAllMetricResults).toHaveBeenCalledWith(mockClient, id(1), metricInfos);
    expect(metricResults.formatResultRows).toHaveBeenCalledWith(mockResults[0], variantNames, {});
  });

  it('falls back to name when display_name is missing', async () => {
    mockClient.getExperiment.mockResolvedValue({
      name: 'fallback-name',
      state: 'draft',
    });
    vi.mocked(metricResults.extractMetricInfos).mockReturnValue([]);
    vi.mocked(metricResults.extractVariantNames).mockReturnValue(new Map());

    const result = await watchExperimentTick(mockClient as any, { experimentId: id(2) });

    expect(result.data.displayName).toBe('fallback-name');
  });

  it('passes variantIndex option through to formatResultRows', async () => {
    const metricInfos = [{ id: 10, name: 'CR', type: 'primary' }];
    const variantNames = new Map([[0, 'Control'], [1, 'Treatment']]);
    const mockResults = [{ metric_id: 10, name: 'CR', type: 'primary', variants: [{ variant: 0, unit_count: 50, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: null, count: null, variance: null, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null }] }];

    vi.mocked(metricResults.extractMetricInfos).mockReturnValue(metricInfos as any);
    vi.mocked(metricResults.extractVariantNames).mockReturnValue(variantNames);
    vi.mocked(metricResults.fetchAllMetricResults).mockResolvedValue(mockResults as any);
    vi.mocked(metricResults.formatResultRows).mockReturnValue([]);

    await watchExperimentTick(mockClient as any, { experimentId: id(1), variantIndex: true });

    expect(metricResults.formatResultRows).toHaveBeenCalledWith(mockResults[0], variantNames, { variantIndex: true });
  });
});
