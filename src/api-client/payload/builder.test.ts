import { describe, it, expect } from 'vitest';
import { buildExperimentPayload } from './builder.js';
import type { ExperimentTemplate } from '../template/parser.js';
import type { ResolverContext } from './resolver.js';

const baseContext: ResolverContext = {
  applications: [{ id: 1, name: 'web' }],
  unitTypes: [{ id: 1, name: 'user_id' }],
  metrics: [{ id: 1, name: 'clicks' }, { id: 2, name: 'revenue' }],
  goals: [{ id: 1, name: 'purchase' }],
};

describe('buildExperimentPayload', () => {
  it('should build minimal payload with defaults', () => {
    const template: ExperimentTemplate = { name: 'my_exp' };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.name).toBe('my_exp');
    expect(payload.display_name).toBe('my_exp');
    expect(payload.type).toBe('test');
    expect(payload.state).toBe('ready');
    expect(payload.traffic).toBe(100);
    expect(payload.percentages).toBe('50/50');
    expect(payload.analysis_type).toBe('group_sequential');
    expect(payload.nr_variants).toBe(2);
    const variants = payload.variants as Array<Record<string, unknown>>;
    expect(variants[0].name).toBe('control');
    expect(variants[1].name).toBe('treatment');
  });

  it('should resolve application by name', () => {
    const template: ExperimentTemplate = { name: 'exp', application: 'web' };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.applications).toEqual([{ application_id: 1, application_version: '0' }]);
  });

  it('should resolve unit_type by name', () => {
    const template: ExperimentTemplate = { name: 'exp', unit_type: 'user_id' };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.unit_type).toEqual({ unit_type_id: 1 });
  });

  it('should resolve primary and secondary metrics', () => {
    const template: ExperimentTemplate = {
      name: 'exp',
      primary_metric: 'clicks',
      secondary_metrics: ['revenue'],
    };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.primary_metric).toEqual({ metric_id: 1 });
    expect(payload.secondary_metrics).toEqual([{ metric_id: 2 }]);
  });

  it('should resolve guardrail metrics', () => {
    const template: ExperimentTemplate = {
      name: 'exp',
      guardrail_metrics: ['revenue'],
    };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.guardrail_metrics).toEqual([{ metric_id: 2 }]);
  });

  it('should build custom variants', () => {
    const template: ExperimentTemplate = {
      name: 'exp',
      variants: [
        { name: 'control', variant: 0, config: '{"a":1}' },
        { name: 'treatment', variant: 1, config: '{"a":2}' },
      ],
    };
    const payload = buildExperimentPayload(template, baseContext);
    const variants = payload.variants as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(2);
    expect(variants[0].name).toBe('control');
    expect(variants[0].config).toBe('{"a":1}');
  });

  it('should throw on invalid variant config JSON', () => {
    const template: ExperimentTemplate = {
      name: 'exp',
      variants: [{ name: 'v0', config: 'not-json' }],
    };
    expect(() => buildExperimentPayload(template, baseContext)).toThrow(/Invalid JSON in variant/);
  });

  it('should include owner and description', () => {
    const template: ExperimentTemplate = {
      name: 'exp',
      owner_id: 42,
      description: 'test desc',
      hypothesis: 'hypothesis',
    };
    const payload = buildExperimentPayload(template, baseContext);
    expect(payload.owners).toEqual([{ user_id: 42 }]);
    expect(payload.description).toBe('test desc');
    expect(payload.hypothesis).toBe('hypothesis');
  });

  describe('variant screenshots', () => {
    it('should include inline file_upload for base64 screenshot', () => {
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
      const template: ExperimentTemplate = {
        name: 'screenshot-exp',
        variants: [
          { name: 'control', variant: 0, config: '{}', screenshot: `data:image/png;base64,${base64}` },
          { name: 'treatment', variant: 1, config: '{}' },
        ],
      };

      const payload = buildExperimentPayload(template, baseContext);
      const screenshots = payload.variant_screenshots as Array<Record<string, unknown>>;

      expect(screenshots).toHaveLength(1);
      expect(screenshots[0].variant).toBe(0);
      const fileUpload = screenshots[0].file_upload as Record<string, unknown>;
      expect(fileUpload.data).toBe(base64);
      expect(fileUpload.content_type).toBe('image/png');
      expect(fileUpload.file_name).toBe('control.png');
    });

    it('should skip variants without screenshots', () => {
      const template: ExperimentTemplate = {
        name: 'no-screenshot-exp',
        variants: [
          { name: 'control', variant: 0, config: '{}' },
          { name: 'treatment', variant: 1, config: '{}' },
        ],
      };

      const payload = buildExperimentPayload(template, baseContext);
      expect(payload.variant_screenshots).toEqual([]);
    });
  });

  it('should build custom section field values', () => {
    const context: ResolverContext = {
      ...baseContext,
      customSectionFields: [
        { id: 10, name: 'launch_date', type: 'string', default_value: '2026-01-01', custom_section: { type: 'test' } },
        { id: 11, name: 'owner', type: 'user', custom_section: { type: 'test' } },
        { id: 12, name: 'archived_field', type: 'string', archived: true, custom_section: { type: 'test' } },
      ],
    };
    const template: ExperimentTemplate = { name: 'exp', owner_id: 5 };
    const payload = buildExperimentPayload(template, context);
    const fields = payload.custom_section_field_values as Record<string, { type: string; value: string }>;
    expect(fields['10']).toEqual({ type: 'string', value: '2026-01-01' });
    expect(fields['11']).toEqual({ type: 'user', value: '5' });
    expect(fields['12']).toBeUndefined();
  });
});
