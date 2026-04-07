import { describe, it, expect } from 'vitest';
import {
  renderCIBar,
  formatImpact,
  formatConfidence,
  formatProgress,
  formatPct,
  formatConfidenceValue,
  formatOwnerName,
  formatOwnerLabel,
  formatExtraField,
} from './format-helpers.js';

describe('renderCIBar', () => {
  it('should render a bar for positive impact', () => {
    const bar = renderCIBar(0.01, 0.05, 0.03);
    expect(bar).toHaveLength(20);
    expect(bar).toContain('●');
    expect(bar).toContain('┊');
  });

  it('should render a bar for negative impact', () => {
    const bar = renderCIBar(-0.05, -0.01, -0.03);
    expect(bar).toHaveLength(20);
    expect(bar).toContain('●');
    expect(bar).toContain('┊');
  });

  it('should render a bar for zero impact with ┊ marker', () => {
    const bar = renderCIBar(-0.02, 0.02, 0);
    expect(bar).toHaveLength(20);
    expect(bar).toContain('┊');
  });

  it('should render a bar for wide CI', () => {
    const bar = renderCIBar(-0.5, 0.5, 0.1);
    expect(bar).toHaveLength(20);
    expect(bar).toContain('═');
  });

  it('should render a bar for narrow CI', () => {
    const bar = renderCIBar(0.009, 0.011, 0.01);
    expect(bar).toHaveLength(20);
    expect(bar).toContain('●');
  });
});

describe('formatImpact', () => {
  it('should return empty string when no preview_variants', () => {
    expect(formatImpact({})).toBe('');
  });

  it('should return empty string when preview_variants is empty', () => {
    expect(formatImpact({ preview_variants: [] })).toBe('');
  });

  it('should return empty string when confidence_variant not found', () => {
    expect(formatImpact({
      preview_variants: [{ variant: 2, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09 }],
      confidence_variant: 3,
    })).toBe('');
  });

  it('should return empty string when impact is null', () => {
    expect(formatImpact({
      preview_variants: [{ variant: 1, impact: null, impact_lower: null, impact_upper: null }],
    })).toBe('');
  });

  it('should format positive impact with text CI by default', () => {
    const result = formatImpact({
      preview_variants: [{ variant: 1, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09 }],
    });
    expect(result).toContain('+5.00%');
    expect(result).toContain('[+1.00%, +9.00%]');
  });

  it('should format with CI bar when ciBar=true', () => {
    const result = formatImpact({
      preview_variants: [{ variant: 1, impact: 0.05, impact_lower: 0.01, impact_upper: 0.09 }],
    }, true);
    expect(result).toContain('+5.00%');
    expect(result).toContain('●');
  });

  it('should format negative impact with text CI', () => {
    const result = formatImpact({
      preview_variants: [{ variant: 1, impact: -0.03, impact_lower: -0.06, impact_upper: -0.01 }],
    });
    expect(result).toContain('-3.00%');
    expect(result).toContain('[-6.00%, -1.00%]');
  });

  it('should use confidence_variant to find the correct variant', () => {
    const result = formatImpact({
      confidence_variant: 2,
      preview_variants: [
        { variant: 1, impact: 0.01, impact_lower: 0.0, impact_upper: 0.02 },
        { variant: 2, impact: 0.10, impact_lower: 0.05, impact_upper: 0.15 },
      ],
    });
    expect(result).toContain('+10.00%');
  });
});

describe('formatConfidence', () => {
  it('should return empty string when no preview_variants', () => {
    expect(formatConfidence({})).toBe('');
  });

  it('should return empty string when preview_variants is empty', () => {
    expect(formatConfidence({ preview_variants: [] })).toBe('');
  });

  it('should return empty string when variant not found', () => {
    expect(formatConfidence({
      preview_variants: [{ variant: 2, pvalue: 0.01 }],
      confidence_variant: 3,
    })).toBe('');
  });

  it('should return empty string when pvalue is null', () => {
    expect(formatConfidence({
      preview_variants: [{ variant: 1, pvalue: null }],
    })).toBe('');
  });

  it('should format confidence from pvalue', () => {
    expect(formatConfidence({
      preview_variants: [{ variant: 1, pvalue: 0.05 }],
    })).toBe('95.0%');
  });
});

describe('formatProgress', () => {
  it('should return empty string when no gsa and no power', () => {
    expect(formatProgress({})).toBe('');
  });

  it('should format GSA progress', () => {
    expect(formatProgress({
      group_sequential_analyses: [1, 2, 3],
      group_sequential_analysis_count: 5,
    })).toBe('3/5');
  });

  it('should use gsa length as total when count not provided', () => {
    expect(formatProgress({
      group_sequential_analyses: [1, 2],
    })).toBe('2/2');
  });

  it('should format power estimate when no GSA', () => {
    expect(formatProgress({
      power: { power_estimate: 0.85 },
    })).toBe('85%');
  });

  it('should prefer GSA over power', () => {
    expect(formatProgress({
      group_sequential_analyses: [1],
      group_sequential_analysis_count: 3,
      power: { power_estimate: 0.9 },
    })).toBe('1/3');
  });

  it('should return empty string when power_estimate is null', () => {
    expect(formatProgress({
      power: { power_estimate: null },
    })).toBe('');
  });

  it('should return empty string when GSA array is empty', () => {
    expect(formatProgress({
      group_sequential_analyses: [],
    })).toBe('');
  });
});

describe('formatPct', () => {
  it('should format positive value with plus sign', () => {
    expect(formatPct(0.05)).toBe('+5.00%');
  });

  it('should format negative value with minus sign', () => {
    expect(formatPct(-0.03)).toBe('-3.00%');
  });

  it('should format zero with plus sign', () => {
    expect(formatPct(0)).toBe('+0.00%');
  });

  it('should format small values', () => {
    expect(formatPct(0.001)).toBe('+0.10%');
  });

  it('should format large values', () => {
    expect(formatPct(1.5)).toBe('+150.00%');
  });
});

describe('formatConfidenceValue', () => {
  it('should format pvalue 0 as 99.99%', () => {
    expect(formatConfidenceValue(0)).toBe('99.99%');
  });

  it('should format pvalue less than 0.001', () => {
    expect(formatConfidenceValue(0.0001)).toBe('99.99%');
  });

  it('should format pvalue 0.05 as 95.0%', () => {
    expect(formatConfidenceValue(0.05)).toBe('95.0%');
  });

  it('should format pvalue 0.5 as 50.0%', () => {
    expect(formatConfidenceValue(0.5)).toBe('50.0%');
  });

  it('should format pvalue 1 as 0.0%', () => {
    expect(formatConfidenceValue(1)).toBe('0.0%');
  });

  it('should use 2 decimals when confidence >= 99.9', () => {
    expect(formatConfidenceValue(0.0005)).toBe('99.95%');
  });

  it('should use 1 decimal when confidence < 99.9', () => {
    expect(formatConfidenceValue(0.02)).toBe('98.0%');
  });
});

describe('formatOwnerName', () => {
  it('should format with first and last name from user', () => {
    expect(formatOwnerName({
      user_id: 1,
      user: { first_name: 'John', last_name: 'Doe' },
    })).toBe('John Doe');
  });

  it('should format with first name only', () => {
    expect(formatOwnerName({
      user_id: 1,
      user: { first_name: 'John' },
    })).toBe('John');
  });

  it('should fallback to user_id when user is missing', () => {
    expect(formatOwnerName({ user_id: 42 })).toBe('user 42');
  });

  it('should fallback to user_id when user has no names', () => {
    expect(formatOwnerName({
      user_id: 5,
      user: {},
    })).toBe('user 5');
  });

  it('should handle null name fields', () => {
    expect(formatOwnerName({
      user_id: 7,
      user: { first_name: null, last_name: null },
    })).toBe('user 7');
  });
});

describe('formatOwnerLabel', () => {
  it('should format with name and email', () => {
    expect(formatOwnerLabel({
      user_id: 1,
      user: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
    })).toBe('Jane Smith <jane@example.com>');
  });

  it('should format with first name and email, no last name', () => {
    expect(formatOwnerLabel({
      user_id: 1,
      user: { first_name: 'Jane', email: 'jane@example.com' },
    })).toBe('Jane <jane@example.com>');
  });

  it('should fallback to user_id when user is missing', () => {
    expect(formatOwnerLabel({ user_id: 42 })).toBe('user 42');
  });

  it('should fallback to user_id when first_name is missing', () => {
    expect(formatOwnerLabel({
      user_id: 3,
      user: { email: 'test@example.com' },
    })).toBe('user 3');
  });

  it('should fallback to user_id when email is missing', () => {
    expect(formatOwnerLabel({
      user_id: 3,
      user: { first_name: 'Bob' },
    })).toBe('user 3');
  });
});

describe('formatExtraField', () => {
  it('should return string values as-is', () => {
    expect(formatExtraField('some_field', 'hello')).toBe('hello');
  });

  it('should return number values as-is', () => {
    expect(formatExtraField('count', 42)).toBe(42);
  });

  it('should return boolean values as-is', () => {
    expect(formatExtraField('active', true)).toBe(true);
  });

  it('should return null as-is', () => {
    expect(formatExtraField('empty', null)).toBe(null);
  });

  it('should return non-experiment_report objects as-is', () => {
    const obj = { foo: 'bar' };
    expect(formatExtraField('some_field', obj)).toBe(obj);
  });

  it('should return arrays as-is for non-experiment_report', () => {
    const arr = [1, 2, 3];
    expect(formatExtraField('items', arr)).toBe(arr);
  });

  it('should format experiment_report with type', () => {
    expect(formatExtraField('experiment_report', { type: 'conclusive' })).toBe('conclusive');
  });

  it('should format experiment_report with type and stop_reason', () => {
    expect(formatExtraField('experiment_report', {
      type: 'conclusive',
      stop_reason: 'winner found',
    })).toBe('conclusive / winner found');
  });

  it('should format experiment_report with full_on_variant', () => {
    expect(formatExtraField('experiment_report', {
      type: 'conclusive',
      full_on_variant: 1,
    })).toBe('conclusive / variant 1');
  });

  it('should format experiment_report with all fields', () => {
    expect(formatExtraField('experiment_report', {
      type: 'conclusive',
      stop_reason: 'winner',
      full_on_variant: 2,
    })).toBe('conclusive / winner / variant 2');
  });

  it('should return empty string for experiment_report with no fields', () => {
    expect(formatExtraField('experiment_report', {})).toBe('');
  });

  it('should skip null full_on_variant in experiment_report', () => {
    expect(formatExtraField('experiment_report', {
      type: 'inconclusive',
      full_on_variant: null,
    })).toBe('inconclusive');
  });

  it('should handle experiment_report key with null value as non-object', () => {
    expect(formatExtraField('experiment_report', null)).toBe(null);
  });
});
