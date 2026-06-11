import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseMetricRoles,
  experimentMetricRoles,
  filterExperimentsByMetric,
  fetchAllExperiments,
  resolveMetricId,
  ALL_METRIC_ROLES,
} from './metric-filter.js';
import { MetricId } from '../../lib/api/branded-types.js';

describe('parseMetricRoles', () => {
  it('defaults to all four roles when input is empty', () => {
    expect(parseMetricRoles(undefined)).toEqual(ALL_METRIC_ROLES);
    expect(parseMetricRoles('')).toEqual(ALL_METRIC_ROLES);
  });

  it('parses a comma-separated subset', () => {
    expect(parseMetricRoles('guardrail,primary')).toEqual(['primary', 'guardrail']);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(parseMetricRoles(' Primary , GUARDRAIL ')).toEqual(['primary', 'guardrail']);
  });

  it('dedupes and returns canonical order', () => {
    expect(parseMetricRoles('exploratory,secondary,secondary')).toEqual([
      'secondary',
      'exploratory',
    ]);
  });

  it('throws on an invalid role, listing valid roles', () => {
    expect(() => parseMetricRoles('primary,bogus')).toThrow(/bogus/);
    expect(() => parseMetricRoles('primary,bogus')).toThrow(
      /primary, secondary, guardrail, exploratory/
    );
  });
});

describe('experimentMetricRoles', () => {
  const metricId = MetricId(42);
  const allRoles = [...ALL_METRIC_ROLES];

  it('detects a primary metric', () => {
    const exp = { primary_metric_id: 42, secondary_metrics: [] };
    expect(experimentMetricRoles(exp, metricId, allRoles)).toEqual(['primary']);
  });

  it('detects secondary, guardrail, and exploratory roles by type', () => {
    expect(
      experimentMetricRoles(
        { secondary_metrics: [{ metric_id: 42, type: 'guardrail' }] },
        metricId,
        allRoles
      )
    ).toEqual(['guardrail']);
    expect(
      experimentMetricRoles(
        { secondary_metrics: [{ metric_id: 42, type: 'exploratory' }] },
        metricId,
        allRoles
      )
    ).toEqual(['exploratory']);
  });

  it('treats a secondary_metrics entry with no type as secondary', () => {
    const exp = { secondary_metrics: [{ metric_id: 42 }] };
    expect(experimentMetricRoles(exp, metricId, allRoles)).toEqual(['secondary']);
  });

  it('returns every role the metric plays, in canonical order', () => {
    const exp = {
      primary_metric_id: 42,
      secondary_metrics: [
        { metric_id: 42, type: 'guardrail' },
        { metric_id: 42, type: 'secondary' },
      ],
    };
    expect(experimentMetricRoles(exp, metricId, allRoles)).toEqual([
      'primary',
      'secondary',
      'guardrail',
    ]);
  });

  it('honors role narrowing: guardrail-only excludes a primary use', () => {
    const exp = {
      primary_metric_id: 42,
      secondary_metrics: [{ metric_id: 42, type: 'guardrail' }],
    };
    expect(experimentMetricRoles(exp, metricId, ['guardrail'])).toEqual(['guardrail']);
  });

  it('returns [] when the metric is not used', () => {
    const exp = { primary_metric_id: 7, secondary_metrics: [{ metric_id: 8, type: 'guardrail' }] };
    expect(experimentMetricRoles(exp, metricId, allRoles)).toEqual([]);
  });

  it('returns [] when the metric is used only in a non-requested role', () => {
    const exp = { primary_metric_id: 42 };
    expect(experimentMetricRoles(exp, metricId, ['guardrail'])).toEqual([]);
  });
});

describe('filterExperimentsByMetric', () => {
  const metricId = MetricId(42);

  it('keeps only matching experiments and tags them with metric_role', () => {
    const experiments = [
      { id: 1, primary_metric_id: 42, secondary_metrics: [] },
      { id: 2, primary_metric_id: 7, secondary_metrics: [{ metric_id: 42, type: 'guardrail' }] },
      { id: 3, primary_metric_id: 7, secondary_metrics: [{ metric_id: 8, type: 'secondary' }] },
    ];
    const result = filterExperimentsByMetric(experiments, metricId, [...ALL_METRIC_ROLES]);
    expect(result.map((e) => e.id)).toEqual([1, 2]);
    expect(result[0]!.metric_role).toBe('primary');
    expect(result[1]!.metric_role).toBe('guardrail');
  });

  it('does not mutate the source experiment objects', () => {
    const exp = { id: 1, primary_metric_id: 42 };
    filterExperimentsByMetric([exp], metricId, [...ALL_METRIC_ROLES]);
    expect('metric_role' in exp).toBe(false);
  });
});

describe('fetchAllExperiments', () => {
  it('aggregates across pages and stops on a short page', async () => {
    const page1 = Array.from({ length: 200 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 200 }, (_, i) => ({ id: 200 + i }));
    const page3 = [{ id: 400 }];
    const listExperiments = vi
      .fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(page3);

    const all = await fetchAllExperiments({ listExperiments } as any, { state: 'running' });

    expect(all).toHaveLength(401);
    expect(listExperiments).toHaveBeenCalledTimes(3);
    expect(listExperiments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ state: 'running', page: 1, items: 200 })
    );
    expect(listExperiments).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
  });

  it('makes a single call when the first page is short', async () => {
    const listExperiments = vi.fn().mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const all = await fetchAllExperiments({ listExperiments } as any, {});
    expect(all).toHaveLength(2);
    expect(listExperiments).toHaveBeenCalledTimes(1);
  });
});

describe('resolveMetricId', () => {
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = {
      getMetric: vi.fn(),
      listMetrics: vi.fn(),
    };
  });

  it('treats a numeric value as an ID and looks up the name', async () => {
    client.getMetric.mockResolvedValue({ id: 42, name: 'Revenue' });
    const result = await resolveMetricId(client as any, '42');
    expect(result).toEqual({ id: 42, name: 'Revenue' });
    expect(client.getMetric).toHaveBeenCalledWith(42);
    expect(client.listMetrics).not.toHaveBeenCalled();
  });

  it('resolves a name to its ID via an exact, case-insensitive match', async () => {
    client.listMetrics.mockResolvedValue([
      { id: 7, name: 'Other' },
      { id: 42, name: 'Revenue' },
    ]);
    const result = await resolveMetricId(client as any, 'revenue');
    expect(result).toEqual({ id: 42, name: 'Revenue' });
    expect(client.getMetric).not.toHaveBeenCalled();
  });

  it('throws when no metric matches the name', async () => {
    client.listMetrics.mockResolvedValue([{ id: 7, name: 'Other' }]);
    await expect(resolveMetricId(client as any, 'Nope')).rejects.toThrow(/No metric/);
  });

  it('throws when multiple metrics share the name, listing candidates', async () => {
    client.listMetrics.mockResolvedValue([
      { id: 10, name: 'Revenue' },
      { id: 11, name: 'Revenue' },
    ]);
    await expect(resolveMetricId(client as any, 'Revenue')).rejects.toThrow(/Multiple metrics/);
    await expect(resolveMetricId(client as any, 'Revenue')).rejects.toThrow(/10[\s\S]*11/);
  });
});
