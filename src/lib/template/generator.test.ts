import { describe, it, expect } from 'vitest';
import { generateTemplate } from './generator.js';
import { createAPIClient } from '../api/client.js';

describe('Template Generator', () => {
  const client = createAPIClient('https://api.absmartly.com/v1', 'test-key');

  it('should generate a basic template', async () => {
    const template = await generateTemplate(client);

    expect(template).toContain('# Experiment Template');
    expect(template).toContain('name: my_experiment');
    expect(template).toContain('type: test');
    expect(template).toContain('## Variants');
    expect(template).toContain('variant_0');
    expect(template).toContain('variant_1');
  });

  it('should use custom name and type', async () => {
    const template = await generateTemplate(client, {
      name: 'custom_test',
      type: 'feature',
    });

    expect(template).toContain('name: custom_test');
    expect(template).toContain('type: feature');
  });

  it('should include available applications', async () => {
    const template = await generateTemplate(client);
    expect(template).toContain('## Unit & Application');
    expect(template).toContain('application:');
  });

  it('should include metrics section', async () => {
    const template = await generateTemplate(client);
    expect(template).toContain('## Metrics');
    expect(template).toContain('primary_metric:');
    expect(template).toContain('secondary_metrics:');
    expect(template).toContain('guardrail_metrics:');
  });

  it('should include description section', async () => {
    const template = await generateTemplate(client);
    expect(template).toContain('## Description');
    expect(template).toContain('**Hypothesis:**');
    expect(template).toContain('**Expected Impact:**');
  });
});
