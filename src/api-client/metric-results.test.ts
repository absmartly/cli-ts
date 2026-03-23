import { describe, it, expect } from 'vitest';
import {
  parseMetricData,
  formatResultRows,
  formatResultRow,
  extractMetricInfos,
  extractVariantNames,
} from './metric-results.js';
import type { MetricResult } from './metric-results.js';

describe('parseMetricData', () => {
  it('should parse columns correctly', () => {
    const data = {
      columnNames: [
        'variant', 'unit_count',
        'metric_5_impact', 'metric_5_impact_ci_lower', 'metric_5_impact_ci_upper',
        'metric_5_pvalue', 'metric_5_mean', 'metric_5', 'metric_5_var',
        'metric_5_abs_impact', 'metric_5_abs_impact_ci_lower', 'metric_5_abs_impact_ci_upper',
      ],
      rows: [
        [0, 500, null, null, null, null, 1.5, 100, 0.5, null, null, null],
        [1, 500, 0.05, 0.02, 0.08, 0.01, 1.6, 110, 0.6, 0.1, 0.03, 0.17],
      ],
    };

    const results = parseMetricData(5, data);
    expect(results).toHaveLength(2);

    expect(results[0]!.variant).toBe(0);
    expect(results[0]!.unit_count).toBe(500);
    expect(results[0]!.impact).toBeNull();
    expect(results[0]!.mean).toBe(1.5);
    expect(results[0]!.count).toBe(100);
    expect(results[0]!.variance).toBe(0.5);

    expect(results[1]!.variant).toBe(1);
    expect(results[1]!.impact).toBe(0.05);
    expect(results[1]!.impact_lower).toBe(0.02);
    expect(results[1]!.impact_upper).toBe(0.08);
    expect(results[1]!.pvalue).toBe(0.01);
    expect(results[1]!.abs_impact).toBe(0.1);
    expect(results[1]!.abs_impact_lower).toBe(0.03);
    expect(results[1]!.abs_impact_upper).toBe(0.17);
  });

  it('should return empty array when variant column is missing', () => {
    const data = { columnNames: ['unit_count'], rows: [[100]] };
    expect(parseMetricData(1, data)).toEqual([]);
  });

  it('should return empty array when unit_count column is missing', () => {
    const data = { columnNames: ['variant'], rows: [[0]] };
    expect(parseMetricData(1, data)).toEqual([]);
  });

  it('should return null for missing metric-specific columns', () => {
    const data = {
      columnNames: ['variant', 'unit_count'],
      rows: [[0, 100]],
    };
    const results = parseMetricData(99, data);
    expect(results).toHaveLength(1);
    expect(results[0]!.impact).toBeNull();
    expect(results[0]!.impact_lower).toBeNull();
    expect(results[0]!.impact_upper).toBeNull();
    expect(results[0]!.pvalue).toBeNull();
    expect(results[0]!.mean).toBeNull();
    expect(results[0]!.count).toBeNull();
    expect(results[0]!.variance).toBeNull();
    expect(results[0]!.abs_impact).toBeNull();
    expect(results[0]!.abs_impact_lower).toBeNull();
    expect(results[0]!.abs_impact_upper).toBeNull();
  });

  it('should handle empty rows', () => {
    const data = { columnNames: ['variant', 'unit_count'], rows: [] };
    expect(parseMetricData(1, data)).toEqual([]);
  });
});

describe('formatResultRows', () => {
  const variantNames = new Map<number, string>([
    [0, 'control'],
    [1, 'treatment'],
  ]);

  it('should format a single treatment row', () => {
    const result: MetricResult = {
      metric_id: 1,
      name: 'conversion',
      type: 'primary',
      variants: [
        { variant: 0, unit_count: 500, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.5, count: 100, variance: 0.5, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 500, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09, pvalue: 0.02, mean: 1.6, count: 110, variance: 0.6, abs_impact: 0.1, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, variantNames);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.metric).toBe('conversion');
    expect(rows[0]!.type).toBe('primary');
    expect(rows[0]!.variant).toBe('treatment');
    expect(rows[0]!.impact).toContain('+5.00%');
    expect(rows[0]!.confidence).toBe('98.0%');
    expect(rows[0]!['control count']).toBeDefined();
    expect(rows[0]!['treatment count']).toBeDefined();
    expect(rows[0]!.abs_impact).toBeDefined();
  });

  it('should format multiple treatments', () => {
    const names = new Map<number, string>([[0, 'control'], [1, 'A'], [2, 'B']]);
    const result: MetricResult = {
      metric_id: 1,
      name: 'metric',
      type: 'secondary',
      variants: [
        { variant: 0, unit_count: 500, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.0, count: 50, variance: 0.1, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 500, impact: 0.03, impact_lower: 0.01, impact_upper: 0.05, pvalue: 0.04, mean: 1.1, count: 55, variance: 0.2, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 2, unit_count: 500, impact: -0.01, impact_lower: -0.03, impact_upper: 0.01, pvalue: 0.5, mean: 0.99, count: 48, variance: 0.15, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, names);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.variant).toBe('A');
    expect(rows[1]!.variant).toBe('B');
  });

  it('should return fallback row when no treatments', () => {
    const result: MetricResult = {
      metric_id: 1,
      name: 'empty-metric',
      type: 'primary',
      variants: [
        { variant: 0, unit_count: 500, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.0, count: 50, variance: 0.1, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, variantNames);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.metric).toBe('empty-metric');
    expect(rows[0]!.impact).toBe('');
    expect(rows[0]!.confidence).toBe('');
    expect(rows[0]!.samples).toBe('');
  });

  it('should handle null impact gracefully', () => {
    const result: MetricResult = {
      metric_id: 1,
      name: 'metric',
      type: 'primary',
      variants: [
        { variant: 0, unit_count: 100, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: null, count: null, variance: null, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 100, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: null, count: null, variance: null, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, variantNames);
    expect(rows[0]!.impact).toBe('');
    expect(rows[0]!.confidence).toBe('');
  });

  it('should use Variant A/B fallback when names are not in the map', () => {
    const emptyNames = new Map<number, string>();
    const result: MetricResult = {
      metric_id: 1,
      name: 'metric',
      type: 'primary',
      variants: [
        { variant: 0, unit_count: 100, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.0, count: 50, variance: 0.1, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 100, impact: 0.01, impact_lower: -0.01, impact_upper: 0.03, pvalue: 0.3, mean: 1.1, count: 55, variance: 0.2, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, emptyNames);
    expect(rows[0]!.variant).toBe('Variant B');
    expect(rows[0]!['Variant A count']).toBeDefined();
    expect(rows[0]!['Variant B count']).toBeDefined();
  });

  it('should use variant index when variantIndex option is true', () => {
    const names = new Map<number, string>([[0, 'control'], [1, 'A'], [2, 'B']]);
    const result: MetricResult = {
      metric_id: 1,
      name: 'metric',
      type: 'secondary',
      variants: [
        { variant: 0, unit_count: 500, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.0, count: 50, variance: 0.1, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 500, impact: 0.03, impact_lower: 0.01, impact_upper: 0.05, pvalue: 0.04, mean: 1.1, count: 55, variance: 0.2, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 2, unit_count: 500, impact: -0.01, impact_lower: -0.03, impact_upper: 0.01, pvalue: 0.5, mean: 0.99, count: 48, variance: 0.15, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const rows = formatResultRows(result, names, { variantIndex: true });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.variant).toBe('v1');
    expect(rows[1]!.variant).toBe('v2');
    expect(rows[0]!['v0 count']).toBeDefined();
    expect(rows[0]!['v1 count']).toBeDefined();
    expect(rows[1]!['v2 count']).toBeDefined();
  });
});

describe('formatResultRow', () => {
  const variantNames = new Map<number, string>([[0, 'control'], [1, 'treatment']]);

  it('should return the first row from formatResultRows', () => {
    const result: MetricResult = {
      metric_id: 1,
      name: 'conversion',
      type: 'primary',
      variants: [
        { variant: 0, unit_count: 500, impact: null, impact_lower: null, impact_upper: null, pvalue: null, mean: 1.0, count: 50, variance: 0.1, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
        { variant: 1, unit_count: 500, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09, pvalue: 0.02, mean: 1.1, count: 55, variance: 0.2, abs_impact: null, abs_impact_lower: null, abs_impact_upper: null },
      ],
    };
    const row = formatResultRow(result, variantNames);
    expect(row.metric).toBe('conversion');
    expect(row.variant).toBe('treatment');
  });

  it('should return fallback when no variants', () => {
    const result: MetricResult = { metric_id: 1, name: 'empty', type: 'primary', variants: [] };
    const row = formatResultRow(result, variantNames);
    expect(row.metric).toBe('empty');
    expect(row.impact).toBe('');
    expect(row.confidence).toBe('');
    expect(row.samples).toBe('');
  });
});

describe('extractMetricInfos', () => {
  it('should extract primary and secondary metrics', () => {
    const experiment = {
      primary_metric_id: 5,
      primary_metric: { name: 'conversion' },
      secondary_metrics: [
        { metric_id: 10, metric: { name: 'revenue' }, type: 'secondary' },
        { metric_id: 11, metric: { name: 'latency' }, type: 'guardrail' },
      ],
    };
    const infos = extractMetricInfos(experiment);
    expect(infos).toHaveLength(3);
    expect(infos[0]).toEqual({ id: 5, name: 'conversion', type: 'primary' });
    expect(infos[1]).toEqual({ id: 10, name: 'revenue', type: 'secondary' });
    expect(infos[2]).toEqual({ id: 11, name: 'latency', type: 'guardrail' });
  });

  it('should return empty array when no metrics', () => {
    expect(extractMetricInfos({})).toEqual([]);
  });

  it('should handle missing primary metric', () => {
    const experiment = {
      secondary_metrics: [
        { metric_id: 10, metric: { name: 'revenue' }, type: 'secondary' },
      ],
    };
    const infos = extractMetricInfos(experiment);
    expect(infos).toHaveLength(1);
    expect(infos[0]!.type).toBe('secondary');
  });

  it('should fallback to metric_id as name when metric object is missing', () => {
    const experiment = {
      secondary_metrics: [
        { metric_id: 99, type: 'secondary' },
      ],
    };
    const infos = extractMetricInfos(experiment);
    expect(infos[0]!.name).toBe('99');
  });

  it('should default type to secondary when not specified', () => {
    const experiment = {
      secondary_metrics: [
        { metric_id: 10, metric: { name: 'clicks' } },
      ],
    };
    const infos = extractMetricInfos(experiment);
    expect(infos[0]!.type).toBe('secondary');
  });
});

describe('extractVariantNames', () => {
  it('should extract variant names', () => {
    const experiment = {
      variants: [
        { variant: 0, name: 'control' },
        { variant: 1, name: 'treatment' },
      ],
    };
    const names = extractVariantNames(experiment);
    expect(names.get(0)).toBe('control');
    expect(names.get(1)).toBe('treatment');
  });

  it('should return empty map when no variants', () => {
    expect(extractVariantNames({}).size).toBe(0);
  });

  it('should fallback to vN when name is empty', () => {
    const experiment = {
      variants: [
        { variant: 0, name: '' },
        { variant: 1, name: '' },
      ],
    };
    const names = extractVariantNames(experiment);
    expect(names.get(0)).toBe('v0');
    expect(names.get(1)).toBe('v1');
  });

  it('should handle mixed named and unnamed variants', () => {
    const experiment = {
      variants: [
        { variant: 0, name: 'control' },
        { variant: 1, name: '' },
        { variant: 2, name: 'blue' },
      ],
    };
    const names = extractVariantNames(experiment);
    expect(names.get(0)).toBe('control');
    expect(names.get(1)).toBe('v1');
    expect(names.get(2)).toBe('blue');
  });
});
