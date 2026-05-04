import { describe, it, expect } from 'vitest';
import {
  computeAnalysisConfidence,
  computeDesignReadout,
  runHeuristics,
} from './heuristics.js';
import type { MetricSignal, LeadingVariant } from './types.js';

const baseInput = {
  experiment: {
    state: 'running',
    hypothesis: 'red button converts better',
    primary_metric_id: 100,
    required_alpha: '0.05',
    analysis_type: 'group_sequential',
    minimum_detectable_effect: 5,
    baseline_primary_metric_mean: 0.1,
    baseline_participants_per_day: 1000,
    percentage_of_traffic: 100,
    secondary_metrics: [{ type: 'guardrail', metric_id: 200 }],
    recommended_action: null,
    started_at: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
  },
  alerts: [],
  metricSignals: [] as MetricSignal[],
  leadingVariant: null as LeadingVariant | null,
  participantCount: 5000,
  benchmark: null as { observed_impacts: number[]; median_abs_impact: number | null } | null,
};

describe('heuristics rules', () => {
  it('blocking_alert fires for srm', () => {
    const { heuristicOutput, recommendation } = runHeuristics({
      ...baseInput,
      alerts: [{ id: 1, type: 'srm', dismissed: false }],
    });
    const rule = heuristicOutput.find(h => h.rule === 'blocking_alert')!;
    expect(rule.fired).toBe(true);
    expect(rule.theme).toBe('warning');
    expect(recommendation?.title).toContain('Investigate');
  });

  it('cleanup_needed fires and produces a warning recommendation', () => {
    const { heuristicOutput, recommendation } = runHeuristics({
      ...baseInput,
      alerts: [{ id: 5, type: 'cleanup_needed', dismissed: false }],
    });
    expect(heuristicOutput.find(h => h.rule === 'cleanup_needed')!.fired).toBe(true);
    expect(recommendation?.theme).toBe('warning');
  });

  it('guardrail_contradicts fires when guardrail signal contradicts', () => {
    const sig: MetricSignal = {
      metric_id: 200, metric_name: 'Latency', metric_type: 'guardrail',
      variant_id: 1, variant_name: 'treatment',
      percent_change: 8, p_value: 0.02, ci_low: 1, ci_high: 15,
      status: 'contradicts',
    };
    const { heuristicOutput } = runHeuristics({ ...baseInput, metricSignals: [sig] });
    expect(heuristicOutput.find(h => h.rule === 'guardrail_contradicts')!.fired).toBe(true);
  });

  it('primary_metric_significant_loss outranks primary_metric_significant_win', () => {
    const sig: MetricSignal = {
      metric_id: 100, metric_name: 'Conv', metric_type: 'primary',
      variant_id: 1, variant_name: 'treatment',
      percent_change: -3, p_value: 0.01, ci_low: -5, ci_high: -1,
      status: 'contradicts',
    };
    const { heuristicOutput, recommendation } = runHeuristics({
      ...baseInput,
      metricSignals: [sig],
      leadingVariant: { variant_id: 1, variant_name: 'treatment', impact_percent: -3, p_value: 0.01 },
    });
    expect(heuristicOutput.find(h => h.rule === 'primary_metric_significant_loss')!.fired).toBe(true);
    expect(heuristicOutput.find(h => h.rule === 'primary_metric_significant_win')!.fired).toBe(false);
    expect(recommendation?.theme).toBe('warning');
  });

  it('primary_metric_significant_win produces a success recommendation when no warning fires', () => {
    const sig: MetricSignal = {
      metric_id: 100, metric_name: 'Conv', metric_type: 'primary',
      variant_id: 1, variant_name: 'treatment',
      percent_change: 6, p_value: 0.01, ci_low: 2, ci_high: 10,
      status: 'improves',
    };
    const { recommendation } = runHeuristics({
      ...baseInput,
      metricSignals: [sig],
      leadingVariant: { variant_id: 1, variant_name: 'treatment', impact_percent: 6, p_value: 0.01 },
    });
    expect(recommendation?.theme).toBe('success');
  });

  it('hypothesis_missing fires when hypothesis is empty', () => {
    const { heuristicOutput } = runHeuristics({
      ...baseInput,
      experiment: { ...baseInput.experiment, hypothesis: '' },
    });
    expect(heuristicOutput.find(h => h.rule === 'hypothesis_missing')!.fired).toBe(true);
  });

  it('snapshot_unavailable fires when participantCount is null and no signals', () => {
    const { heuristicOutput } = runHeuristics({
      ...baseInput,
      participantCount: null,
      metricSignals: [],
    });
    expect(heuristicOutput.find(h => h.rule === 'snapshot_unavailable')!.fired).toBe(true);
  });

  it('no_recommendation_overdue fires when running >=21 days with no recommended_action', () => {
    const { heuristicOutput } = runHeuristics({
      ...baseInput,
      experiment: {
        ...baseInput.experiment,
        started_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
      },
    });
    expect(heuristicOutput.find(h => h.rule === 'no_recommendation_overdue')!.fired).toBe(true);
  });

  it('sample_size_not_reached fires for running group_sequential without the alert', () => {
    const a = runHeuristics({ ...baseInput });
    expect(a.heuristicOutput.find(h => h.rule === 'sample_size_not_reached')!.fired).toBe(true);

    const b = runHeuristics({
      ...baseInput,
      alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
    });
    expect(b.heuristicOutput.find(h => h.rule === 'sample_size_not_reached')!.fired).toBe(false);
  });

  it('returns null recommendation when no rule fires meaningfully', () => {
    const { recommendation } = runHeuristics({
      ...baseInput,
      experiment: { ...baseInput.experiment, started_at: new Date().toISOString() },
    });
    expect(recommendation).toBeNull();
  });

  it('emits all rules in stable order', () => {
    const { heuristicOutput } = runHeuristics(baseInput);
    expect(heuristicOutput.map(h => h.rule)).toEqual([
      'blocking_alert',
      'cleanup_needed',
      'guardrail_contradicts',
      'primary_metric_significant_loss',
      'primary_metric_significant_win',
      'sample_size_not_reached',
      'hypothesis_missing',
      'no_recommendation_overdue',
      'snapshot_unavailable',
    ]);
  });
});

describe('computeAnalysisConfidence', () => {
  it('returns high when all factors true', () => {
    const c = computeAnalysisConfidence({
      ...baseInput,
      alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
    });
    expect(c.level).toBe('high');
    expect(c.reasons).toEqual([]);
  });

  it('downgrades to medium with one missing factor', () => {
    const c = computeAnalysisConfidence({
      ...baseInput,
      alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
      experiment: { ...baseInput.experiment, hypothesis: '' },
    });
    expect(c.level).toBe('medium');
    expect(c.factors.hypothesis_present).toBe(false);
    expect(c.reasons).toHaveLength(1);
  });

  it('drops to low when a blocking alert is present', () => {
    const c = computeAnalysisConfidence({
      ...baseInput,
      alerts: [{ id: 1, type: 'srm', dismissed: false }],
    });
    expect(c.level).toBe('low');
    expect(c.factors.no_blocking_alerts).toBe(false);
  });

  it('drops to low when 2+ factors missing', () => {
    const c = computeAnalysisConfidence({
      ...baseInput,
      alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
      experiment: {
        ...baseInput.experiment,
        hypothesis: '',
        secondary_metrics: [],
      },
    });
    expect(c.level).toBe('low');
  });
});

describe('computeDesignReadout', () => {
  it('uses benchmark median to phrase the summary when available and aligned with MDE', () => {
    const r = computeDesignReadout({
      ...baseInput,
      benchmark: { observed_impacts: [9, 8, 11], median_abs_impact: 9 },
    });
    expect(r.summary).toMatch(/comparable experiments moved this metric/);
    expect(r.benchmark).toEqual({ observed_impacts: [9, 8, 11], median_abs_impact: 9 });
  });

  it('warns when MDE is too large vs benchmark', () => {
    const r = computeDesignReadout({
      ...baseInput,
      experiment: { ...baseInput.experiment, minimum_detectable_effect: 20 },
      benchmark: { observed_impacts: [2, 3, 4], median_abs_impact: 3 },
    });
    expect(r.summary).toMatch(/smaller expected effect/);
  });

  it('uses the in-between phrasing when benchmark median is between 0.5x and 1.5x of MDE', () => {
    const r = computeDesignReadout({
      ...baseInput,
      experiment: { ...baseInput.experiment, minimum_detectable_effect: 5 },
      benchmark: { observed_impacts: [4, 5, 6], median_abs_impact: 5 },
    });
    expect(r.summary).toMatch(/Design appears usable/);
  });

  it('falls back when no benchmark available', () => {
    const r = computeDesignReadout({ ...baseInput, benchmark: null });
    expect(r.summary).toMatch(/Insufficient comparable history/);
  });

  it('flags low traffic in notes', () => {
    const r = computeDesignReadout({
      ...baseInput,
      experiment: { ...baseInput.experiment, percentage_of_traffic: 5 },
    });
    expect(r.notes.some(n => /traffic/i.test(n))).toBe(true);
  });
});
