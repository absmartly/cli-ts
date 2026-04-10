import { describe, it, expect } from 'vitest';
import { summarizeExperiment, stateToDate, summarizeExperimentRow } from './experiment-summary.js';

describe('summarizeExperiment', () => {
  const baseExperiment = {
    id: 1,
    name: 'test-exp',
    display_name: 'Test Experiment',
    type: 'ab',
    state: 'running',
    percentage_of_traffic: 100,
    percentages: '50/50',
    applications: [{ application: { name: 'web-app' } }],
    unit_type: { name: 'user_id' },
    primary_metric: { name: 'conversion' },
    variants: [
      { variant: 0, name: 'control' },
      { variant: 1, name: 'treatment' },
    ],
    owners: [{ user_id: 1, user: { first_name: 'John', last_name: 'Doe' } }],
    teams: [{ name: 'growth' }],
    experiment_tags: [{ tag: { name: 'important' } }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    start_at: '2025-01-03T00:00:00Z',
    stop_at: '2025-01-10T00:00:00Z',
  };

  it('should summarize a basic experiment with all fields', () => {
    const summary = summarizeExperiment(baseExperiment);
    expect(summary.id).toBe(1);
    expect(summary.name).toBe('test-exp');
    expect(summary.display_name).toBe('Test Experiment');
    expect(summary.type).toBe('ab');
    expect(summary.state).toBe('running');
    expect(summary.application).toBe('web-app');
    expect(summary.unit_type).toBe('user_id');
    expect(summary.primary_metric).toBe('conversion');
    expect(summary.variants).toBe('control, treatment');
    expect(summary.percentages).toBe('50/50');
    expect(summary.owners).toBe('John Doe');
    expect(summary.teams).toBe('growth');
    expect(summary.tags).toBe('important');
    expect(summary.created_at).toBe(new Date('2025-01-01T00:00:00Z').toLocaleDateString());
    expect(summary.start_at).toBe(new Date('2025-01-03T00:00:00Z').toLocaleDateString());
  });

  it('should handle missing optional fields', () => {
    const summary = summarizeExperiment({ id: 2, name: 'minimal' });
    expect(summary.id).toBe(2);
    expect(summary.name).toBe('minimal');
    expect(summary.display_name).toBe('');
    expect(summary.application).toBe('');
    expect(summary.unit_type).toBe('');
    expect(summary.primary_metric).toBe('');
    expect(summary.variants).toBe('');
    expect(summary.owners).toBe('');
    expect(summary.teams).toBe('');
    expect(summary.tags).toBe('');
  });

  it('should include secondary, guardrail, and exploratory metrics', () => {
    const exp = {
      ...baseExperiment,
      secondary_metrics: [
        { type: 'secondary', metric: { name: 'revenue' }, metric_id: 10 },
        { type: 'guardrail', metric: { name: 'latency' }, metric_id: 11 },
        { type: 'exploratory', metric: { name: 'clicks' }, metric_id: 12 },
        { metric: { name: 'signups' }, metric_id: 13 },
      ],
    };
    const summary = summarizeExperiment(exp);
    expect(summary.secondary_metrics).toBe('revenue, signups');
    expect(summary.guardrail_metrics).toBe('latency');
    expect(summary.exploratory_metrics).toBe('clicks');
  });

  it('should not include metric categories when empty', () => {
    const summary = summarizeExperiment(baseExperiment);
    expect(summary.secondary_metrics).toBeUndefined();
    expect(summary.guardrail_metrics).toBeUndefined();
    expect(summary.exploratory_metrics).toBeUndefined();
  });

  it('should include preview_variants result data', () => {
    const exp = {
      ...baseExperiment,
      primary_metric_id: 5,
      preview_variants: [
        {
          metric_id: 5,
          variant: 1,
          unit_count: 1000,
          impact: 0.05,
          pvalue: 0.01,
          impact_lower: 0.02,
          impact_upper: 0.08,
        },
      ],
    };
    const summary = summarizeExperiment(exp);
    const resultKey = 'result (treatment)';
    expect(summary[resultKey]).toBeDefined();
    const resultStr = summary[resultKey] as string;
    expect(resultStr).toContain('n=');
    expect(resultStr).toContain('impact=5.00%');
    expect(resultStr).toContain('p=0.0100');
    expect(resultStr).toContain('CI=');
  });

  it('should use variant index fallback for result names', () => {
    const exp = {
      id: 1,
      name: 'test',
      variants: [],
      primary_metric_id: 5,
      preview_variants: [
        {
          metric_id: 5,
          variant: 1,
          unit_count: 100,
          impact: 0.01,
          pvalue: 0.5,
          impact_lower: -0.01,
          impact_upper: 0.03,
        },
      ],
    };
    const summary = summarizeExperiment(exp);
    expect(summary['result (variant 1)']).toBeDefined();
  });

  it('should handle extra fields from experiment properties', () => {
    const exp = { ...baseExperiment, description: 'A test' };
    const summary = summarizeExperiment(exp, ['description']);
    expect(summary.description).toBe('A test');
  });

  it('should handle extra fields from custom field values', () => {
    const exp = {
      ...baseExperiment,
      custom_section_field_values: [
        { custom_section_field: { title: 'Audience' }, value: 'US users' },
      ],
    };
    const summary = summarizeExperiment(exp, ['audience']);
    expect(summary.audience).toBe('US users');
  });

  it('should not overwrite existing summary fields with extra fields', () => {
    const summary = summarizeExperiment(baseExperiment, ['name']);
    expect(summary.name).toBe('test-exp');
  });

  it('should format experiment_report extra field', () => {
    const exp = {
      ...baseExperiment,
      experiment_report: { type: 'conclusive', stop_reason: 'winner' },
    };
    const summary = summarizeExperiment(exp, ['experiment_report']);
    expect(summary.experiment_report).toBe('conclusive / winner');
  });
});

describe('stateToDate', () => {
  const exp = {
    created_at: '2025-01-01T12:00:00Z',
    start_at: '2025-02-01T12:00:00Z',
    stop_at: '2025-03-01T12:00:00Z',
  };

  it('should return start_at for running state', () => {
    expect(stateToDate('running', exp)).toBe(new Date('2025-02-01T12:00:00Z').toLocaleDateString());
  });

  it('should return stop_at for stopped state', () => {
    expect(stateToDate('stopped', exp)).toBe(new Date('2025-03-01T12:00:00Z').toLocaleDateString());
  });

  it('should return stop_at for archived state', () => {
    expect(stateToDate('archived', exp)).toBe(
      new Date('2025-03-01T12:00:00Z').toLocaleDateString()
    );
  });

  it('should return created_at for other states', () => {
    expect(stateToDate('created', exp)).toBe(new Date('2025-01-01T12:00:00Z').toLocaleDateString());
  });

  it('should return empty string for missing date', () => {
    expect(stateToDate('running', {})).toBe('');
  });

  it('should truncate to date portion only', () => {
    expect(stateToDate('running', { start_at: '2025-06-15T23:59:59Z' })).toBe(
      new Date('2025-06-15T23:59:59Z').toLocaleDateString()
    );
  });
});

describe('summarizeExperimentRow', () => {
  const baseExperiment = {
    id: 10,
    name: 'row-exp',
    type: 'ab',
    state: 'running',
    percentage_of_traffic: 80,
    percentages: '50/50',
    applications: [{ application: { name: 'mobile' } }],
    unit_type: { name: 'device_id' },
    primary_metric: { name: 'ctr' },
    owners: [{ user_id: 2, user: { first_name: 'Alice', last_name: 'B' } }],
    start_at: '2025-04-01T00:00:00Z',
    created_at: '2025-03-15T00:00:00Z',
  };

  it('should produce a row with expected fields (defaults exclude unit_type, traffic, owner)', () => {
    const row = summarizeExperimentRow(baseExperiment);
    expect(row.id).toBe(10);
    expect(row.name).toBe('row-exp');
    expect(row.type).toBe('ab');
    expect(row.state).toBe('running');
    expect(row.state_since).toBe(new Date('2025-04-01T00:00:00Z').toLocaleDateString());
    expect(row.app).toBe('mobile');
    expect(row.unit_type).toBeUndefined();
    expect(row.traffic).toBeUndefined();
    expect(row.primary_metric).toBe('ctr');
    expect(row.owner).toBeUndefined();
    expect(row.percentages).toBe('50/50');
  });

  it('should include unit_type/traffic/owner when --show overrides defaults', () => {
    const row = summarizeExperimentRow(baseExperiment, ['unit_type', 'traffic', 'owner']);
    expect(row.unit_type).toBe('device_id');
    expect(row.traffic).toBe('80%');
    expect(row.owner).toBe('Alice B');
  });

  it('should include impact and confidence when preview_variants present', () => {
    const exp = {
      ...baseExperiment,
      preview_variants: [
        { variant: 1, impact: 0.03, impact_lower: 0.01, impact_upper: 0.05, pvalue: 0.02 },
      ],
    };
    const row = summarizeExperimentRow(exp);
    expect(row.impact).toContain('+3.00%');
    expect(row.confidence).toBe('98.0%');
  });

  it('should include extra fields', () => {
    const exp = { ...baseExperiment, description: 'My experiment' };
    const row = summarizeExperimentRow(exp, ['description']);
    expect(row.description).toBe('My experiment');
  });

  it('should not overwrite existing row fields with extra fields', () => {
    const row = summarizeExperimentRow(baseExperiment, ['name']);
    expect(row.name).toBe('row-exp');
  });

  it('should handle missing optional fields gracefully', () => {
    const row = summarizeExperimentRow({
      id: 1,
      name: 'min',
      state: 'created',
      percentage_of_traffic: 100,
    });
    expect(row.app).toBe('');
    expect(row.primary_metric).toBe('');
    expect(row.unit_type).toBeUndefined();
    expect(row.owner).toBeUndefined();
  });
});
