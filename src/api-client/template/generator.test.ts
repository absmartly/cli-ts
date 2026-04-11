import { describe, it, expect } from 'vitest';
import { generateTemplate } from './generator.js';

describe('generateTemplate', () => {
  it('should generate template with context data', () => {
    const result = generateTemplate({
      applications: [{ name: 'web' }, { name: 'mobile' }],
      unitTypes: [{ name: 'user_id' }],
      metrics: [{ name: 'clicks' }, { name: 'revenue' }],
    });
    expect(result).toContain('unit_type: user_id');
    expect(result).toContain('application: web');
    expect(result).toContain('Available: web, mobile');
    expect(result).toContain('primary_metric: clicks');
    expect(result).toContain('name: my_experiment');
    expect(result).toContain('type: test');
  });

  it('should use custom name and type', () => {
    const result = generateTemplate(
      { applications: [], unitTypes: [], metrics: [] },
      { name: 'checkout_test', type: 'feature' }
    );
    expect(result).toContain('name: checkout_test');
    expect(result).toContain('display_name: checkout test');
    expect(result).toContain('type: feature');
  });

  it('should fallback to defaults when context is empty', () => {
    const result = generateTemplate({ applications: [], unitTypes: [], metrics: [] });
    expect(result).toContain('unit_type: user_id');
    expect(result).toContain('application: www');
    expect(result).not.toContain('primary_metric:');
  });

  it('should truncate metrics list when more than 5', () => {
    const metrics = Array.from({ length: 8 }, (_, i) => ({ name: `m${i}` }));
    const result = generateTemplate({ applications: [], unitTypes: [], metrics });
    expect(result).toContain('...');
    expect(result).toContain('m0, m1, m2, m3, m4');
  });

  it('should generate end_date in the future', () => {
    const result = generateTemplate({ applications: [], unitTypes: [], metrics: [] });
    const match = result.match(/end_date:\s*(\S+)/);
    expect(match).not.toBeNull();
    const endDate = new Date(match![1]);
    expect(endDate.getTime()).toBeGreaterThan(Date.now());
  });
});
