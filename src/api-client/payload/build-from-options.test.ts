import { describe, it, expect } from 'vitest';
import { buildPayloadFromOptions } from './build-from-options.js';

describe('buildPayloadFromOptions', () => {
  it('should build minimal payload with defaults', async () => {
    const data = await buildPayloadFromOptions({ name: 'exp', type: 'test' });
    expect(data.name).toBe('exp');
    expect(data.analysis_type).toBe('group_sequential');
    expect(data.group_sequential_futility_type).toBe('binding');
    expect(data.group_sequential_min_analysis_interval).toBe('1d');
    expect(data.group_sequential_first_analysis_interval).toBe('7d');
    expect(data.group_sequential_max_duration_interval).toBe('6w');
  });

  it('should not include group_sequential fields for fixed_horizon', async () => {
    const data = await buildPayloadFromOptions({ name: 'exp', type: 'test', analysisType: 'fixed_horizon' });
    expect(data.analysis_type).toBe('fixed_horizon');
    expect(data.group_sequential_futility_type).toBeUndefined();
    expect(data.group_sequential_min_analysis_interval).toBeUndefined();
    expect(data.group_sequential_first_analysis_interval).toBeUndefined();
    expect(data.group_sequential_max_duration_interval).toBeUndefined();
    expect(data.group_sequential_analysis_count).toBeUndefined();
  });

  it('should allow overriding group_sequential fields', async () => {
    const data = await buildPayloadFromOptions({
      name: 'exp',
      type: 'test',
      analysisType: 'group_sequential',
      groupSequentialFutilityType: 'non_binding',
      groupSequentialAnalysisCount: '10',
      groupSequentialMinAnalysisInterval: '2d',
      groupSequentialFirstAnalysisInterval: '14d',
      groupSequentialMaxDurationInterval: '12w',
    });
    expect(data.group_sequential_futility_type).toBe('non_binding');
    expect(data.group_sequential_analysis_count).toBe('10');
    expect(data.group_sequential_min_analysis_interval).toBe('2d');
    expect(data.group_sequential_first_analysis_interval).toBe('14d');
    expect(data.group_sequential_max_duration_interval).toBe('12w');
  });

  it('should include minimum_detectable_effect when set', async () => {
    const data = await buildPayloadFromOptions({ name: 'exp', type: 'test', minimumDetectableEffect: '5.0' });
    expect(data.minimum_detectable_effect).toBe('5.0');
  });

  it('should not include minimum_detectable_effect when not set', async () => {
    const data = await buildPayloadFromOptions({ name: 'exp', type: 'test' });
    expect(data.minimum_detectable_effect).toBeUndefined();
  });

  it('should include baseline metric stats when set', async () => {
    const data = await buildPayloadFromOptions({
      name: 'exp',
      type: 'test',
      baselinePrimaryMetricMean: '42.5',
      baselinePrimaryMetricStdev: '10.2',
    });
    expect(data.baseline_primary_metric_mean).toBe('42.5');
    expect(data.baseline_primary_metric_stdev).toBe('10.2');
  });

  it('should not include baseline metric stats when not set', async () => {
    const data = await buildPayloadFromOptions({ name: 'exp', type: 'test' });
    expect(data.baseline_primary_metric_mean).toBeUndefined();
    expect(data.baseline_primary_metric_stdev).toBeUndefined();
  });
});
