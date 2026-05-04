import { describe, it, expect } from 'vitest';
import { summarizeAnalyzeResult } from './summary.js';
import type { AnalyzeResult } from './types.js';

const baseResult: AnalyzeResult = {
  experiment: {
    id: 42,
    name: 'demo',
    type: 'test',
    state: 'running',
    hypothesis: 'h',
    primary_metric_name: 'Conversions',
    unit_type_name: 'user_id',
    participant_count: 5100,
    leading_variant_name: 'treatment',
    leading_variant_impact_percent: 7.5,
    leading_variant_confidence: 0.9876,
    current_recommended_action: 'review',
    report_note: 'note',
  },
  alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
  recommendation: { theme: 'success', title: 'Win!', details: 'd' },
  metric_signals: [
    {
      metric_id: 100,
      metric_name: 'Conv',
      metric_type: 'primary',
      variant_id: 1,
      variant_name: 'treatment',
      percent_change: 7.5,
      p_value: 0.01,
      ci_low: 4,
      ci_high: 11,
      status: 'improves',
    },
  ],
  related_experiments: [],
  analysis_confidence: {
    level: 'high',
    reasons: [],
    factors: {
      sample_size_reached: true,
      hypothesis_present: true,
      primary_metric_present: true,
      guardrails_present: true,
      no_blocking_alerts: true,
    },
  },
  design_readout: {
    summary: 'OK',
    notes: ['one', 'two'],
    parameters: {
      analysis_type: 'group_sequential',
      required_alpha: 0.05,
      required_power: 0.8,
      minimum_detectable_effect: 5,
      baseline_primary_metric_mean: 0.1,
      baseline_participants_per_day: 1000,
      percentage_of_traffic: 100,
    },
    benchmark: null,
  },
  source_signals: [{ covers: 'experiment.participant_count', source: 'x' }],
  heuristic_output: [
    {
      rule: 'primary_metric_significant_win',
      fired: true,
      theme: 'success',
      title: 't',
      details: 'd',
      evidence: {},
    },
    {
      rule: 'hypothesis_missing',
      fired: false,
      theme: 'info',
      title: 't',
      details: 'd',
      evidence: {},
    },
  ],
};

describe('summarizeAnalyzeResult', () => {
  it('produces a flat record with the expected keys and values', () => {
    const s = summarizeAnalyzeResult(baseResult);
    expect(s).toEqual({
      id: 42,
      name: 'demo',
      type: 'test',
      state: 'running',
      primary_metric: 'Conversions',
      unit_type: 'user_id',
      participants: 5100,
      leading_variant: 'treatment',
      leading_impact_pct: 7.5,
      leading_confidence: 0.988,
      analysis_confidence: 'high',
      analysis_confidence_reasons: '',
      recommendation: 'Win!',
      recommendation_theme: 'success',
      design_summary: 'OK',
      design_notes: 'one; two',
      current_recommended_action: 'review',
      report_note: 'note',
      alerts_count: 1,
      metric_signals_count: 1,
      related_experiments_count: 0,
      heuristics_fired: 'primary_metric_significant_win',
      source_signals_count: 1,
    });
  });

  it('handles nullish leading_variant_confidence and missing recommendation', () => {
    const s = summarizeAnalyzeResult({
      ...baseResult,
      experiment: { ...baseResult.experiment, leading_variant_confidence: null },
      recommendation: null,
    });
    expect(s.leading_confidence).toBeNull();
    expect(s.recommendation).toBeNull();
    expect(s.recommendation_theme).toBeNull();
  });

  it('joins reasons with "; " when present', () => {
    const s = summarizeAnalyzeResult({
      ...baseResult,
      analysis_confidence: { ...baseResult.analysis_confidence, reasons: ['a', 'b'] },
    });
    expect(s.analysis_confidence_reasons).toBe('a; b');
  });
});
