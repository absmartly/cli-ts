import { describe, it, expect } from 'vitest';
import { extractSignals } from './extract-signals.js';

const baseExperiment = {
  primary_metric_id: 100,
  primary_metric: { id: 100, name: 'Conversions' },
  secondary_metrics: [
    { metric_id: 200, type: 'guardrail', metric: { id: 200, name: 'Latency', lower_is_better: true } },
    { metric_id: 300, type: 'secondary', metric: { id: 300, name: 'Revenue' } },
  ],
  variants: [
    { variant: 0, name: 'control' },
    { variant: 1, name: 'treatment' },
  ],
  required_alpha: '0.05',
  metrics_snapshot: {
    columnNames: [
      'metric_id',
      'variant',
      'percent_change',
      'p_value',
      'confidence_interval_low',
      'confidence_interval_high',
      'cum_unit_count',
    ],
    rows: [
      [100, 0, 0, 1, null, null, 5000],
      [100, 1, 7.5, 0.01, 4.0, 11.0, 5100],
      [200, 1, 12.0, 0.04, 5.0, 19.0, 5100],
      [300, 1, 0.2, 0.6, -1, 1.4, 5100],
    ],
  },
};

describe('extractSignals', () => {
  it('produces metric signals with metric_type tagged from membership', () => {
    const out = extractSignals(baseExperiment as any);
    const primary = out.metricSignals.find(s => s.metric_id === 100 && s.variant_id === 1);
    const guardrail = out.metricSignals.find(s => s.metric_id === 200);
    const secondary = out.metricSignals.find(s => s.metric_id === 300);
    expect(primary?.metric_type).toBe('primary');
    expect(guardrail?.metric_type).toBe('guardrail');
    expect(secondary?.metric_type).toBe('secondary');
  });

  it('flags primary improvement as `improves`', () => {
    const out = extractSignals(baseExperiment as any);
    const primary = out.metricSignals.find(s => s.metric_id === 100 && s.variant_id === 1)!;
    expect(primary.status).toBe('improves');
  });

  it('flags guardrail regression as `contradicts` (lower_is_better)', () => {
    const out = extractSignals(baseExperiment as any);
    const guardrail = out.metricSignals.find(s => s.metric_id === 200)!;
    // lower_is_better=true and percent_change=+12% with p<alpha → contradicts
    expect(guardrail.status).toBe('contradicts');
  });

  it('flags small flat secondary as `flat`', () => {
    const out = extractSignals(baseExperiment as any);
    const secondary = out.metricSignals.find(s => s.metric_id === 300)!;
    expect(secondary.status).toBe('flat');
  });

  it('returns leading variant by largest primary percent_change', () => {
    const out = extractSignals(baseExperiment as any);
    expect(out.leadingVariant).toEqual({
      variant_id: 1,
      variant_name: 'treatment',
      impact_percent: 7.5,
      p_value: 0.01,
    });
  });

  it('returns participant_count as max cum_unit_count of primary metric', () => {
    const out = extractSignals(baseExperiment as any);
    expect(out.participantCount).toBe(5100);
  });

  it('returns nulls/empty when snapshot missing', () => {
    const exp = { ...baseExperiment, metrics_snapshot: undefined };
    const out = extractSignals(exp as any);
    expect(out.metricSignals).toEqual([]);
    expect(out.leadingVariant).toBeNull();
    expect(out.participantCount).toBeNull();
  });

  it('returns nulls/empty when snapshot has empty rows', () => {
    const exp = { ...baseExperiment, metrics_snapshot: { columnNames: [], rows: [] } };
    const out = extractSignals(exp as any);
    expect(out.metricSignals).toEqual([]);
    expect(out.leadingVariant).toBeNull();
    expect(out.participantCount).toBeNull();
  });

  it('uses required_alpha when present, else 0.1', () => {
    const exp = {
      ...baseExperiment,
      required_alpha: undefined,
      metrics_snapshot: {
        columnNames: ['metric_id', 'variant', 'percent_change', 'p_value', 'cum_unit_count'],
        rows: [
          [100, 1, 5.0, 0.08, 100], // 0.08 < 0.1 default → improves; would be inconclusive at 0.05
        ],
      },
    };
    const out = extractSignals(exp as any);
    const primary = out.metricSignals[0]!;
    expect(primary.status).toBe('improves');
  });
});
