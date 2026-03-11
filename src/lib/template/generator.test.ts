import { describe, it, expect } from 'vitest';
import { generateTemplate } from '../../api-client/template/generator.js';
import type { GeneratorContext } from '../../api-client/template/generator.js';

const DEFAULT_CONTEXT: GeneratorContext = {
  applications: [{ name: 'www' }, { name: 'mobile' }],
  unitTypes: [{ name: 'user_id' }, { name: 'session_id' }],
  metrics: [{ name: 'conversion' }, { name: 'revenue' }],
};

describe('Template Generator', () => {
  it('should generate a basic template', () => {
    const template = generateTemplate(DEFAULT_CONTEXT);

    expect(template).toContain('# Experiment Template');
    expect(template).toContain('name: my_experiment');
    expect(template).toContain('type: test');
    expect(template).toContain('## Variants');
    expect(template).toContain('variant_0');
    expect(template).toContain('variant_1');
  });

  it('should use custom name and type', () => {
    const template = generateTemplate(DEFAULT_CONTEXT, {
      name: 'custom_test',
      type: 'feature',
    });

    expect(template).toContain('name: custom_test');
    expect(template).toContain('type: feature');
  });

  it('should include available applications', () => {
    const template = generateTemplate(DEFAULT_CONTEXT);
    expect(template).toContain('## Unit & Application');
    expect(template).toContain('application:');
  });

  it('should include metrics section', () => {
    const template = generateTemplate(DEFAULT_CONTEXT);
    expect(template).toContain('## Metrics');
    expect(template).toContain('primary_metric:');
    expect(template).toContain('secondary_metrics:');
    expect(template).toContain('guardrail_metrics:');
  });

  it('should include description section', () => {
    const template = generateTemplate(DEFAULT_CONTEXT);
    expect(template).toContain('## Description');
    expect(template).toContain('**Hypothesis:**');
    expect(template).toContain('**Expected Impact:**');
  });
});
