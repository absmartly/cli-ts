import { describe, it, expect } from 'vitest';
import {
  parseMetricFilters,
  validateMetricFilters,
  hasActiveMetricFilters,
  filterMetrics,
} from './filter.js';

describe('parseMetricFilters', () => {
  it('splits comma-separated values and trims them', () => {
    const f = parseMetricFilters({
      metricType: 'goal_count, goal_ratio',
      goal: '1, purchase',
      outlierMethod: 'quantile,stdev',
      impactDirection: 'positive',
      propertyFilterPath: 'page_name , order',
      propertyFilterContains: '  BookingFullDetails  ',
    });
    expect(f.metricType).toEqual(['goal_count', 'goal_ratio']);
    expect(f.goal).toEqual(['1', 'purchase']);
    expect(f.outlierMethod).toEqual(['quantile', 'stdev']);
    expect(f.impactDirection).toEqual(['positive']);
    expect(f.propertyFilterPath).toEqual(['page_name', 'order']);
    expect(f.propertyFilterContains).toBe('BookingFullDetails');
  });

  it('returns undefined for absent / empty values', () => {
    const f = parseMetricFilters({});
    expect(f.metricType).toBeUndefined();
    expect(f.goal).toBeUndefined();
    expect(f.outlierLimiting).toBeUndefined();
    expect(f.hasPropertyFilter).toBeUndefined();
    expect(f.cuped).toBeUndefined();
    expect(f.propertyFilterContains).toBeUndefined();
  });

  it('reads tri-state booleans for outlier limiting and cuped', () => {
    expect(parseMetricFilters({ outlierLimiting: true }).outlierLimiting).toBe(true);
    expect(parseMetricFilters({ outlierLimiting: false }).outlierLimiting).toBe(false);
    expect(parseMetricFilters({ cuped: true }).cuped).toBe(true);
    expect(parseMetricFilters({ cuped: false }).cuped).toBe(false);
  });

  it('collapses the property-filter dest pair into a tri-state', () => {
    // neither flag: commander leaves propertyFilter at its default true; we ignore it
    expect(parseMetricFilters({ propertyFilter: true }).hasPropertyFilter).toBeUndefined();
    // --has-property-filter
    expect(parseMetricFilters({ hasPropertyFilter: true, propertyFilter: true }).hasPropertyFilter).toBe(true);
    // --no-property-filter
    expect(parseMetricFilters({ propertyFilter: false }).hasPropertyFilter).toBe(false);
  });
});

describe('hasActiveMetricFilters', () => {
  it('is false when nothing is set', () => {
    expect(hasActiveMetricFilters(parseMetricFilters({}))).toBe(false);
  });
  it('is true when any filter is set, including false booleans', () => {
    expect(hasActiveMetricFilters(parseMetricFilters({ metricType: 'goal_count' }))).toBe(true);
    expect(hasActiveMetricFilters(parseMetricFilters({ outlierLimiting: false }))).toBe(true);
    expect(hasActiveMetricFilters(parseMetricFilters({ propertyFilter: false }))).toBe(true);
    expect(hasActiveMetricFilters(parseMetricFilters({ cuped: true }))).toBe(true);
  });
});

describe('validateMetricFilters', () => {
  it('rejects unknown outlier methods', () => {
    const opts = { outlierMethod: 'bogus' };
    expect(() => validateMetricFilters(opts, parseMetricFilters(opts))).toThrow(/outlier.*method/i);
  });
  it('rejects unknown impact directions', () => {
    const opts = { impactDirection: 'sideways' };
    expect(() => validateMetricFilters(opts, parseMetricFilters(opts))).toThrow(/impact.*direction/i);
  });
  it('rejects passing both --has-property-filter and --no-property-filter', () => {
    const opts = { hasPropertyFilter: true, propertyFilter: false };
    expect(() => validateMetricFilters(opts, parseMetricFilters(opts))).toThrow(/property-filter/i);
  });
  it('accepts valid values', () => {
    const opts = { outlierMethod: 'quantile,stdev', impactDirection: 'positive,negative' };
    expect(() => validateMetricFilters(opts, parseMetricFilters(opts))).not.toThrow();
  });
});

type M = Record<string, unknown>;
const metric = (over: M = {}): M => ({
  id: 1,
  name: 'm',
  type: 'goal_count',
  effect: 'positive',
  goal_id: 1,
  goal: { id: 1, name: 'page_view' },
  denominator_goal_id: null,
  denominator_goal: null,
  outlier_limit_method: 'unlimited',
  denominator_outlier_limit_method: null,
  vr_lookback_interval: null,
  denominator_vr_lookback_interval: null,
  property_filter: null,
  denominator_property_filter: null,
  ...over,
});

describe('filterMetrics - type / impact / goal', () => {
  it('returns all metrics when no filters are active', () => {
    const data = [metric(), metric({ id: 2 })];
    expect(filterMetrics(data, parseMetricFilters({}))).toHaveLength(2);
  });

  it('filters by metric type (case-insensitive, OR within list)', () => {
    const data = [
      metric({ id: 1, type: 'goal_count' }),
      metric({ id: 2, type: 'goal_ratio' }),
      metric({ id: 3, type: 'custom_sql' }),
    ];
    const out = filterMetrics(data, parseMetricFilters({ metricType: 'GOAL_COUNT,goal_ratio' }));
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });

  it('filters by impact direction', () => {
    const data = [
      metric({ id: 1, effect: 'positive' }),
      metric({ id: 2, effect: 'negative' }),
      metric({ id: 3, effect: 'unknown' }),
    ];
    const out = filterMetrics(data, parseMetricFilters({ impactDirection: 'negative,unknown' }));
    expect(out.map((m) => m.id)).toEqual([2, 3]);
  });

  it('filters by goal numeric id (numerator or denominator)', () => {
    const data = [
      metric({ id: 1, goal_id: 1 }),
      metric({ id: 2, goal_id: 9, denominator_goal_id: 1 }),
      metric({ id: 3, goal_id: 5 }),
    ];
    const out = filterMetrics(data, parseMetricFilters({ goal: '1' }));
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });

  it('filters by goal name substring (numerator or denominator)', () => {
    const data = [
      metric({ id: 1, goal: { id: 1, name: 'page_view' } }),
      metric({ id: 2, goal: { id: 2, name: 'checkout' }, denominator_goal: { id: 3, name: 'page_view_all' } }),
      metric({ id: 3, goal: { id: 4, name: 'purchase' } }),
    ];
    const out = filterMetrics(data, parseMetricFilters({ goal: 'page_view' }));
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });
});
