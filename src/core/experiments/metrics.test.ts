import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMetricDeps, listExperimentMetrics, addExperimentMetrics } from './metrics.js';
import type { ExperimentId, MetricId } from '../../lib/api/branded-types.js';

vi.mock('../../api-client/metric-results.js', () => ({
  extractMetricInfos: vi.fn().mockReturnValue([]),
  extractVariantNames: vi.fn().mockReturnValue(['control', 'treatment']),
  fetchAllMetricResults: vi.fn().mockResolvedValue([]),
  formatResultRows: vi.fn().mockReturnValue([]),
  metricOwners: vi.fn().mockReturnValue('owner1'),
  parseCachedMetricData: vi.fn().mockReturnValue([]),
}));

vi.mock('../../lib/utils/date-parser.js', () => ({
  parseDateFlagOrUndefined: vi.fn().mockReturnValue(undefined),
}));

const id = (n: number) => n as ExperimentId;
const metricId = (n: number) => n as MetricId;

describe('metrics', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getExperiment: vi.fn(),
      listMetricUsages: vi.fn(),
      addExperimentMetrics: vi.fn().mockResolvedValue(undefined),
      getMetric: vi.fn(),
      getExperimentMetricsCached: vi.fn(),
      listSegments: vi.fn(),
    };
  });

  describe('getMetricDeps', () => {
    it('returns {data: null, warnings} when metric not found', async () => {
      mockClient.listMetricUsages.mockResolvedValue([
        { id: metricId(99), metric_shared_metadata: {}, usage: {} },
      ]);
      const result = await getMetricDeps(mockClient as any, { metricId: metricId(1) });
      expect(result.data).toBeNull();
      expect(result.warnings).toEqual([
        'Metric 1 not found in usage data. Verify the metric ID exists.',
      ]);
    });

    it('returns metric data when found', async () => {
      const metric = {
        id: metricId(5),
        metric_shared_metadata: { owner: 'team-a' },
        usage: { exp1: { count: 10 } },
      };
      mockClient.listMetricUsages.mockResolvedValue([metric]);
      const result = await getMetricDeps(mockClient as any, { metricId: metricId(5) });
      expect(result.data).toEqual({
        metric,
        meta: { owner: 'team-a' },
        usage: { exp1: { count: 10 } },
      });
      expect(result.detail).toBe(metric);
    });

    it('handles missing metadata gracefully', async () => {
      const metric = { id: metricId(3) };
      mockClient.listMetricUsages.mockResolvedValue([metric]);
      const result = await getMetricDeps(mockClient as any, { metricId: metricId(3) });
      expect(result.data!.meta).toEqual({});
      expect(result.data!.usage).toEqual({});
    });
  });

  describe('listExperimentMetrics', () => {
    it('returns primary and secondary metrics', async () => {
      mockClient.getExperiment.mockResolvedValue({
        primary_metric_id: 1,
        primary_metric: { name: 'Click Rate' },
        secondary_metrics: [
          { metric_id: 2, type: 'secondary', metric: { name: 'Revenue' } },
          { metric_id: 3, type: 'guardrail', metric: { name: 'Error Rate' } },
        ],
      });
      const result = await listExperimentMetrics(mockClient as any, { experimentId: id(10) });
      expect(result.data).toHaveLength(3);
      expect(result.data![0]).toEqual(expect.objectContaining({ id: 1, name: 'Click Rate', type: 'primary' }));
      expect(result.data![1]).toEqual(expect.objectContaining({ id: 2, name: 'Revenue', type: 'secondary' }));
      expect(result.data![2]).toEqual(expect.objectContaining({ id: 3, name: 'Error Rate', type: 'guardrail' }));
    });

    it('returns empty when no metrics', async () => {
      mockClient.getExperiment.mockResolvedValue({});
      const result = await listExperimentMetrics(mockClient as any, { experimentId: id(1) });
      expect(result.data).toEqual([]);
    });
  });

  describe('addExperimentMetrics', () => {
    it('calls client and returns experimentId', async () => {
      const result = await addExperimentMetrics(mockClient as any, {
        experimentId: id(1),
        metricIds: [metricId(10), metricId(20)],
      });
      expect(mockClient.addExperimentMetrics).toHaveBeenCalledWith(id(1), [metricId(10), metricId(20)]);
      expect(result.data).toEqual({ experimentId: id(1) });
    });
  });
});
