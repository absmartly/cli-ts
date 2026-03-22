import { describe, it, expect } from 'vitest';
import { buildSecondaryMetrics } from './metrics-builder.js';

describe('buildSecondaryMetrics', () => {
  it('builds entries from all three categories with sequential order_index', () => {
    const result = buildSecondaryMetrics({
      secondary: [{ id: 1 }, { id: 2 }],
      guardrail: [{ id: 3 }],
      exploratory: [{ id: 4 }],
    });

    expect(result).toEqual([
      { metric_id: 1, type: 'secondary', order_index: 0 },
      { metric_id: 2, type: 'secondary', order_index: 1 },
      { metric_id: 3, type: 'guardrail', order_index: 2 },
      { metric_id: 4, type: 'exploratory', order_index: 3 },
    ]);
  });

  it('starts order_index at 0 for secondary only', () => {
    const result = buildSecondaryMetrics({
      secondary: [{ id: 10 }],
    });

    expect(result).toEqual([
      { metric_id: 10, type: 'secondary', order_index: 0 },
    ]);
  });

  it('assigns guardrail type correctly', () => {
    const result = buildSecondaryMetrics({
      guardrail: [{ id: 5 }],
    });

    expect(result).toEqual([
      { metric_id: 5, type: 'guardrail', order_index: 0 },
    ]);
  });

  it('returns empty array when all categories are empty', () => {
    const result = buildSecondaryMetrics({});

    expect(result).toEqual([]);
  });

  it('sequences order_index across mixed categories', () => {
    const result = buildSecondaryMetrics({
      secondary: [{ id: 1 }],
      exploratory: [{ id: 2 }, { id: 3 }],
    });

    expect(result).toEqual([
      { metric_id: 1, type: 'secondary', order_index: 0 },
      { metric_id: 2, type: 'exploratory', order_index: 1 },
      { metric_id: 3, type: 'exploratory', order_index: 2 },
    ]);
  });
});
