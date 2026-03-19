import { describe, it, expect } from 'vitest';
import { experimentToInput } from './experiment-transform.js';
import type { Experiment } from './types.js';
import type { ExperimentId } from './types.js';

const FULL_EXPERIMENT = {
  id: 42 as ExperimentId,
  name: 'test_experiment',
  display_name: 'Test Experiment',
  state: 'created',
  iteration: 1,
  percentage_of_traffic: 100,
  nr_variants: 2,
  percentages: '50/50',
  audience: '{}',
  audience_strict: false,
  type: 'experiment',
  team_id: 5,
  application_id: 1,
  environment_id: 1,
  note: 'some note',
  version: 3,
  unit_type: {
    unit_type_id: 1,
    name: 'user_id',
  },
  owners: [
    {
      experiment_id: 42,
      user_id: 3,
      user: { user_id: 3, email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
    },
    {
      experiment_id: 42,
      user_id: 7,
      user: { user_id: 7, email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith' },
    },
  ],
  teams: [
    {
      experiment_id: 42,
      team_id: 5,
      team: { team_id: 5, name: 'Backend' },
    },
  ],
  experiment_tags: [
    {
      experiment_id: 42,
      experiment_tag_id: 10,
      experiment_tag: { experiment_tag_id: 10, tag: 'performance' },
    },
    {
      experiment_id: 42,
      experiment_tag_id: 20,
      experiment_tag: { experiment_tag_id: 20, tag: 'checkout' },
    },
  ],
  applications: [
    {
      experiment_id: 42,
      application_id: 1,
      application_version: '0',
      application: { application_id: 1, name: 'web' },
    },
  ],
  primary_metric: {
    metric_id: 4,
    type: 'primary',
    order_index: 0,
  },
  secondary_metrics: [
    { metric_id: 50, type: 'secondary', order_index: 0 },
    { metric_id: 53, type: 'guardrail', order_index: 0 },
  ],
  variants: [
    { variant: 0, name: 'Control', config: '{}' },
    { variant: 1, name: 'Treatment', config: '{"color":"red"}' },
  ],
  variant_screenshots: [
    {
      experiment_id: 42,
      variant: 0,
      screenshot_file_upload_id: 100,
      label: 'control.png',
      file_upload: { file_upload_id: 100, filename: 'control.png' },
    },
  ],
  custom_section_field_values: [
    {
      experiment_id: 42,
      experiment_custom_section_field_id: 1,
      type: 'text',
      value: 'My hypothesis',
      updated_at: null,
      updated_by_user_id: 3,
      custom_section_field: { id: 1, section_id: 1, title: 'Hypothesis' },
      id: 1,
      default_value: '',
    },
  ],
  created_by: { user_id: 3, email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
  updated_by: { user_id: 3, email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
} as unknown as Experiment;

describe('experimentToInput', () => {
  describe('base fields', () => {
    it('preserves base fields as-is', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.name).toBe('test_experiment');
      expect(input.display_name).toBe('Test Experiment');
      expect(input.state).toBe('created');
      expect(input.iteration).toBe(1);
      expect(input.percentage_of_traffic).toBe(100);
      expect(input.nr_variants).toBe(2);
      expect(input.percentages).toBe('50/50');
      expect(input.audience).toBe('{}');
      expect(input.audience_strict).toBe(false);
    });
  });

  describe('stripped fields', () => {
    it('strips system-generated fields', () => {
      const input = experimentToInput(FULL_EXPERIMENT) as Record<string, unknown>;
      expect(input.id).toBeUndefined();
      expect(input.environment_id).toBeUndefined();
      expect(input.note).toBeUndefined();
      expect(input.created_by).toBeUndefined();
      expect(input.updated_by).toBeUndefined();
      expect(input.version).toBeUndefined();
    });
  });

  describe('passthrough fields', () => {
    it('passes through type and other scalar fields as-is', () => {
      const input = experimentToInput(FULL_EXPERIMENT) as Record<string, unknown>;
      expect(input.type).toBe('experiment');
      expect(input.team_id).toBe(5);
      expect(input.application_id).toBe(1);
    });

    it('passes through any new fields without needing code changes', () => {
      const exp = {
        ...FULL_EXPERIMENT,
        analysis_type: 'bayesian',
        required_alpha: 0.05,
        some_future_api_field: 'hello',
      } as unknown as Experiment;
      const input = experimentToInput(exp) as Record<string, unknown>;
      expect(input.analysis_type).toBe('bayesian');
      expect(input.required_alpha).toBe(0.05);
      expect(input.some_future_api_field).toBe('hello');
    });
  });

  describe('unit_type', () => {
    it('keeps only unit_type_id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.unit_type).toEqual({ unit_type_id: 1 });
    });

    it('returns undefined when unit_type is missing', () => {
      const exp = { ...FULL_EXPERIMENT, unit_type: undefined } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.unit_type).toBeUndefined();
    });
  });

  describe('owners', () => {
    it('keeps only user_id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.owners).toEqual([{ user_id: 3 }, { user_id: 7 }]);
    });

    it('defaults to empty array when missing', () => {
      const exp = { ...FULL_EXPERIMENT, owners: undefined } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.owners).toEqual([]);
    });
  });

  describe('teams', () => {
    it('keeps only team_id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.teams).toEqual([{ team_id: 5 }]);
    });
  });

  describe('experiment_tags', () => {
    it('keeps only experiment_tag_id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.experiment_tags).toEqual([
        { experiment_tag_id: 10 },
        { experiment_tag_id: 20 },
      ]);
    });
  });

  describe('applications', () => {
    it('keeps application_id and application_version', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.applications).toEqual([
        { application_id: 1, application_version: '0' },
      ]);
    });
  });

  describe('primary_metric', () => {
    it('keeps only metric_id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.primary_metric).toEqual({ metric_id: 4 });
    });

    it('defaults to metric_id 0 when missing', () => {
      const exp = { ...FULL_EXPERIMENT, primary_metric: undefined } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.primary_metric).toEqual({ metric_id: 0 });
    });
  });

  describe('secondary_metrics', () => {
    it('keeps metric_id, type, and order_index', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.secondary_metrics).toEqual([
        { metric_id: 50, type: 'secondary', order_index: 0 },
        { metric_id: 53, type: 'guardrail', order_index: 0 },
      ]);
    });
  });

  describe('variants', () => {
    it('keeps variant, name, and config only', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.variants).toEqual([
        { variant: 0, name: 'Control', config: '{}' },
        { variant: 1, name: 'Treatment', config: '{"color":"red"}' },
      ]);
    });
  });

  describe('variant_screenshots', () => {
    it('strips experiment_id and file_upload', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.variant_screenshots).toEqual([
        { variant: 0, screenshot_file_upload_id: 100, label: 'control.png' },
      ]);
    });
  });

  describe('custom_section_field_values', () => {
    it('converts array to object keyed by field id', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      expect(input.custom_section_field_values).toEqual({
        '1': {
          experiment_id: 42,
          experiment_custom_section_field_id: 1,
          type: 'text',
          value: 'My hypothesis',
        },
      });
    });

    it('passes through when already an object', () => {
      const exp = {
        ...FULL_EXPERIMENT,
        custom_section_field_values: {
          '1': { experiment_id: 42, experiment_custom_section_field_id: 1, type: 'text', value: 'hello' },
        },
      } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.custom_section_field_values).toEqual({
        '1': { experiment_id: 42, experiment_custom_section_field_id: 1, type: 'text', value: 'hello' },
      });
    });

    it('handles multiple custom fields', () => {
      const exp = {
        ...FULL_EXPERIMENT,
        custom_section_field_values: [
          { experiment_id: 42, experiment_custom_section_field_id: 1, type: 'text', value: 'Hyp' },
          { experiment_id: 42, experiment_custom_section_field_id: 5, type: 'text', value: 'Purpose' },
          { experiment_id: 42, experiment_custom_section_field_id: 12, type: 'richtext', value: '<p>Details</p>' },
        ],
      } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(Object.keys(input.custom_section_field_values).sort()).toEqual(['1', '12', '5']);
      expect(input.custom_section_field_values['5'].value).toBe('Purpose');
    });

    it('defaults to empty object when missing', () => {
      const exp = { ...FULL_EXPERIMENT, custom_section_field_values: undefined } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.custom_section_field_values).toEqual({});
    });

    it('uses field_id as fallback key', () => {
      const exp = {
        ...FULL_EXPERIMENT,
        custom_section_field_values: [
          { experiment_id: 42, field_id: 99, type: 'text', value: 'test' },
        ],
      } as unknown as Experiment;
      const input = experimentToInput(exp);
      expect(input.custom_section_field_values['99']).toBeDefined();
      expect(input.custom_section_field_values['99'].experiment_custom_section_field_id).toBe(99);
    });
  });

  describe('minimal experiment', () => {
    it('produces valid output with only required fields', () => {
      const minimal = {
        id: 1 as ExperimentId,
        name: 'min',
        display_name: 'Min',
        state: 'created',
        iteration: 1,
        percentage_of_traffic: 100,
        nr_variants: 0,
        percentages: '',
        audience: '',
        audience_strict: false,
      } as unknown as Experiment;
      const input = experimentToInput(minimal);
      expect(input.owners).toEqual([]);
      expect(input.teams).toEqual([]);
      expect(input.experiment_tags).toEqual([]);
      expect(input.applications).toEqual([]);
      expect(input.primary_metric).toEqual({ metric_id: 0 });
      expect(input.secondary_metrics).toEqual([]);
      expect(input.variants).toEqual([]);
      expect(input.variant_screenshots).toEqual([]);
      expect(input.custom_section_field_values).toEqual({});
    });
  });

  describe('merge with overrides', () => {
    it('can be spread-merged with partial changes', () => {
      const input = experimentToInput(FULL_EXPERIMENT);
      const merged = { ...input, name: 'updated_name', display_name: 'Updated' };
      expect(merged.name).toBe('updated_name');
      expect(merged.display_name).toBe('Updated');
      expect(merged.unit_type).toEqual({ unit_type_id: 1 });
      expect(merged.owners).toEqual([{ user_id: 3 }, { user_id: 7 }]);
    });
  });
});
