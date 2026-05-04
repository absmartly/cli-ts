import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeExperiment } from './index.js';
import type { ExperimentId } from '../../../lib/api/branded-types.js';

const id = (n: number) => n as ExperimentId;

const baseExperiment = {
  id: 1,
  name: 'Focal',
  type: 'test',
  state: 'running',
  required_alpha: '0.05',
  analysis_type: 'group_sequential',
  minimum_detectable_effect: 5,
  percentage_of_traffic: 100,
  hypothesis: 'red beats blue',
  primary_metric_id: 100,
  primary_metric: { id: 100, name: 'Conversions' },
  unit_type: { id: 1, name: 'user_id' },
  variants: [
    { variant: 0, name: 'control' },
    { variant: 1, name: 'treatment' },
  ],
  secondary_metrics: [
    {
      metric_id: 200,
      type: 'guardrail',
      metric: { id: 200, name: 'Latency', lower_is_better: true },
    },
  ],
  alerts: [{ id: 9, type: 'sample_size_reached', dismissed: false }],
  recommended_action: { recommendation: 'review' },
  experiment_report: { experiment_note: { note: 'Looking good.' } },
  metrics_snapshot: {
    columnNames: ['metric_id', 'variant', 'percent_change', 'p_value', 'cum_unit_count'],
    rows: [
      [100, 0, 0, 1, 5000],
      [100, 1, 7.5, 0.01, 5100],
    ],
  },
  started_at: new Date(Date.now() - 14 * 86400 * 1000).toISOString(),
};

describe('analyzeExperiment', () => {
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = {
      getExperiment: vi.fn().mockResolvedValue(baseExperiment),
      listExperiments: vi.fn().mockResolvedValue([
        { id: 1, primary_metric_id: 100 }, // self — should be filtered out
        {
          id: 2,
          name: 'r2',
          state: 'stopped',
          primary_metric_id: 100,
          primary_metric: { id: 100, name: 'Conversions' },
        },
        {
          id: 3,
          name: 'r3',
          state: 'stopped',
          primary_metric_id: 100,
          primary_metric: { id: 100, name: 'Conversions' },
        },
      ]),
      getExperimentMetricsCached: vi.fn().mockResolvedValue({
        columnNames: ['metric_id', 'variant', 'percent_change'],
        rows: [
          [100, 0, 0],
          [100, 1, 4],
        ],
      }),
      listExperimentAlerts: vi.fn().mockResolvedValue([]),
    };
  });

  it('assembles a complete AnalyzeResult', async () => {
    const res = await analyzeExperiment(client as any, { experimentId: id(1) });
    expect(res.data.experiment.name).toBe('Focal');
    expect(res.data.experiment.participant_count).toBe(5100);
    expect(res.data.experiment.leading_variant_name).toBe('treatment');
    expect(res.data.experiment.leading_variant_impact_percent).toBe(7.5);
    expect(res.data.experiment.current_recommended_action).toBe('review');
    expect(res.data.experiment.report_note).toBe('Looking good.');
    expect(res.data.alerts).toEqual([{ id: 9, type: 'sample_size_reached', dismissed: false }]);
    expect(res.data.metric_signals.length).toBeGreaterThan(0);
    expect(res.data.related_experiments.map((r) => r.id).sort()).toEqual([2, 3]);
    expect(res.data.recommendation?.theme).toBe('success');
    expect(res.data.analysis_confidence.level).toBe('high');
    expect(res.data.heuristic_output.length).toBeGreaterThan(0);
    expect(res.data.source_signals.length).toBeGreaterThan(0);
  });

  it('falls back to listExperimentAlerts when alerts not embedded', async () => {
    client.getExperiment.mockResolvedValue({ ...baseExperiment, alerts: undefined });
    client.listExperimentAlerts.mockResolvedValue([{ id: 7, type: 'srm', dismissed: false }]);
    const res = await analyzeExperiment(client as any, { experimentId: id(1) });
    expect(client.listExperimentAlerts).toHaveBeenCalledWith(id(1));
    expect(res.data.alerts).toEqual([{ id: 7, type: 'srm', dismissed: false }]);
  });

  it('continues when listExperiments fails and records source_signal', async () => {
    client.listExperiments.mockRejectedValue(new Error('forbidden'));
    const res = await analyzeExperiment(client as any, { experimentId: id(1) });
    expect(res.data.related_experiments).toEqual([]);
    expect(
      res.data.source_signals.some(
        (s) => s.covers === 'related_experiments' && /error/.test(s.source)
      )
    ).toBe(true);
  });

  it('emits snapshot_unavailable heuristic when metrics_snapshot missing', async () => {
    client.getExperiment.mockResolvedValue({ ...baseExperiment, metrics_snapshot: undefined });
    const res = await analyzeExperiment(client as any, { experimentId: id(1) });
    expect(res.data.experiment.participant_count).toBeNull();
    expect(res.data.heuristic_output.find((h) => h.rule === 'snapshot_unavailable')!.fired).toBe(
      true
    );
  });

  it('passes the right list options to listExperiments', async () => {
    await analyzeExperiment(client as any, { experimentId: id(1) });
    expect(client.listExperiments).toHaveBeenCalledWith({
      type: 'test',
      items: 25,
      sort: 'updated_at',
      ascending: false,
    });
  });
});
