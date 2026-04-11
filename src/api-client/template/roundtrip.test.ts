import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { experimentToMarkdown } from './serializer.js';
import { parseExperimentMarkdown } from './parser.js';
import { buildExperimentPayload } from '../payload/builder.js';
import type { ResolverContext } from '../payload/resolver.js';
import type { Experiment } from '../types.js';
import { existsSync, readFileSync } from 'fs';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

const context: ResolverContext = {
  applications: [
    { id: 1, name: 'web' },
    { id: 2, name: 'mobile' },
  ],
  unitTypes: [
    { id: 1, name: 'user_id' },
    { id: 2, name: 'session_id' },
  ],
  metrics: [
    { id: 10, name: 'clicks' },
    { id: 11, name: 'revenue' },
    { id: 12, name: 'latency' },
    { id: 13, name: 'conversion_rate' },
    { id: 14, name: 'bounce_rate' },
    { id: 15, name: 'archived_metric' },
  ],
  goals: [{ id: 1, name: 'purchase' }],
  users: [
    { id: 100, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith' },
    { id: 101, email: 'bob@example.com', first_name: 'Bob', last_name: 'Jones' },
  ],
  teams: [
    { id: 50, name: 'Growth' },
    { id: 51, name: 'Platform' },
  ],
  experimentTags: [
    { id: 200, tag: 'pricing' },
    { id: 201, tag: 'onboarding' },
  ],
  customSectionFields: [
    {
      id: 300,
      title: 'Hypothesis',
      name: 'hypothesis',
      type: 'string',
      default_value: '',
      archived: false,
      custom_section: { type: 'test', archived: false },
    },
    {
      id: 301,
      title: 'Expected Impact',
      name: 'expected_impact',
      type: 'string',
      default_value: 'medium',
      archived: false,
      custom_section: { type: 'test', archived: false },
    },
    {
      id: 302,
      title: 'Feature Owner',
      name: 'feature_owner',
      type: 'user',
      default_value: '',
      archived: false,
      custom_section: { type: 'test', archived: false },
    },
    {
      id: 310,
      title: 'Rollout Plan',
      name: 'rollout_plan',
      type: 'string',
      default_value: '',
      archived: false,
      custom_section: { type: 'feature', archived: false },
    },
  ],
};

function makeExperiment(overrides: Record<string, unknown> = {}): Experiment {
  return {
    id: 1 as any,
    name: 'checkout-redesign',
    display_name: 'Checkout Redesign',
    type: 'test',
    state: 'running',
    percentage_of_traffic: 80,
    percentages: '50/50',
    unit_type: { unit_type_id: 1, name: 'user_id' },
    applications: [{ application_id: 1, application: { name: 'web' }, application_version: '0' }],
    primary_metric: { metric_id: 10, name: 'clicks' },
    secondary_metrics: [
      {
        metric_id: 11,
        metric: { name: 'revenue' },
        name: 'revenue',
        type: 'secondary',
        order_index: 0,
      },
      {
        metric_id: 12,
        metric: { name: 'latency' },
        name: 'latency',
        type: 'guardrail',
        order_index: 1,
      },
      {
        metric_id: 13,
        metric: { name: 'conversion_rate' },
        name: 'conversion_rate',
        type: 'exploratory',
        order_index: 2,
      },
    ],
    owners: [
      {
        user_id: 100,
        user: { first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com' },
      },
    ],
    teams: [{ team_id: 50, team: { name: 'Growth' } }],
    experiment_tags: [{ experiment_tag_id: 200, experiment_tag: { tag: 'pricing' } }],
    variants: [
      { name: 'control', variant: 0, config: '{"color":"red"}' },
      { name: 'treatment', variant: 1, config: '{"color":"blue"}' },
    ],
    analysis_type: 'group_sequential',
    required_alpha: '0.05',
    required_power: '0.8',
    baseline_participants_per_day: '50',
    ...overrides,
  } as any;
}

describe('template roundtrip', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readFileSync).mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('export -> parse roundtrip', () => {
    it('should preserve all frontmatter fields through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.name).toBe('checkout-redesign');
      expect(template.display_name).toBe('Checkout Redesign');
      expect(template.type).toBe('test');
      expect(template.state).toBe('running');
      expect(template.percentage_of_traffic).toBe(80);
      expect(template.percentages).toBe('50/50');
      expect(template.unit_type).toBe('user_id');
      expect(template.application).toBe('web');
      expect(template.primary_metric).toBe('clicks');
    });

    it('should preserve metric groups through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.secondary_metrics).toEqual(['revenue']);
      expect(template.guardrail_metrics).toEqual(['latency']);
      expect(template.exploratory_metrics).toEqual(['conversion_rate']);
    });

    it('should preserve owners in Name <email> format', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.owners).toHaveLength(1);
      expect(template.owners![0]).toMatch(/Alice/);
      expect(template.owners![0]).toMatch(/<alice@example\.com>/);
    });

    it('should preserve teams through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.teams).toEqual(['Growth']);
    });

    it('should preserve tags through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.tags).toEqual(['pricing']);
    });

    it('should preserve variants through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.variants).toHaveLength(2);
      expect(template.variants![0]!.name).toBe('control');
      expect(template.variants![0]!.variant).toBe(0);
      expect(template.variants![0]!.config).toBe('{"color":"red"}');
      expect(template.variants![1]!.name).toBe('treatment');
      expect(template.variants![1]!.variant).toBe(1);
      expect(template.variants![1]!.config).toBe('{"color":"blue"}');
    });

    it('should preserve analysis settings through serialize/parse', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.analysis_type).toBe('group_sequential');
      expect(String(template.required_alpha)).toBe('0.05');
      expect(String(template.required_power)).toBe('0.8');
      expect(String(template.baseline_participants)).toBe('50');
    });
  });

  describe('export -> create roundtrip', () => {
    it('should produce a payload matching the original experiment', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload, warnings } = await buildExperimentPayload(template, context);

      expect(payload.name).toBe('checkout-redesign');
      expect(payload.display_name).toBe('Checkout Redesign');
      expect(payload.type).toBe('test');
      expect(payload.state).toBe('running');
      expect(payload.percentage_of_traffic).toBe(80);
      expect(payload.percentages).toBe('50/50');

      expect(payload.applications).toEqual([{ application_id: 1, application_version: '0' }]);
      expect(payload.unit_type).toEqual({ unit_type_id: 1 });
      expect(payload.primary_metric).toEqual({ metric_id: 10 });

      const secondaryMetrics = payload.secondary_metrics as Array<Record<string, unknown>>;
      expect(secondaryMetrics).toHaveLength(3);
      expect(secondaryMetrics[0]).toEqual({ metric_id: 11, type: 'secondary', order_index: 0 });
      expect(secondaryMetrics[1]).toEqual({ metric_id: 12, type: 'guardrail', order_index: 1 });
      expect(secondaryMetrics[2]).toEqual({ metric_id: 13, type: 'exploratory', order_index: 2 });

      expect(payload.owners).toEqual([{ user_id: 100 }]);
      expect(payload.teams).toEqual([{ team_id: 50 }]);
      expect(payload.experiment_tags).toEqual([{ experiment_tag_id: 200 }]);

      const variants = payload.variants as Array<Record<string, unknown>>;
      expect(variants).toHaveLength(2);
      expect(variants[0]).toEqual({ name: 'control', variant: 0, config: '{"color":"red"}' });
      expect(variants[1]).toEqual({ name: 'treatment', variant: 1, config: '{"color":"blue"}' });

      expect(payload.analysis_type).toBe('group_sequential');
      expect(String(payload.required_alpha)).toBe('0.05');
      expect(String(payload.required_power)).toBe('0.8');
      expect(String(payload.baseline_participants_per_day)).toBe('50');

      const unknownFieldWarnings = warnings.filter((w) => w.includes('Unknown template field'));
      expect(unknownFieldWarnings).toEqual([]);
    });
  });

  describe('export -> update roundtrip', () => {
    it('should detect only the changed field in the rebuilt payload', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      const { payload: originalPayload } = await buildExperimentPayload(template, context);

      template.display_name = 'Updated Checkout Redesign';
      const { payload: updatedPayload } = await buildExperimentPayload(template, context);

      expect(updatedPayload.display_name).toBe('Updated Checkout Redesign');
      expect(originalPayload.display_name).toBe('Checkout Redesign');

      expect(updatedPayload.name).toBe(originalPayload.name);
      expect(updatedPayload.type).toBe(originalPayload.type);
      expect(updatedPayload.applications).toEqual(originalPayload.applications);
      expect(updatedPayload.primary_metric).toEqual(originalPayload.primary_metric);
      expect(updatedPayload.variants).toEqual(originalPayload.variants);
    });

    it('should allow modifying metrics between export cycles', async () => {
      const experiment = makeExperiment();
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      template.secondary_metrics = ['revenue', 'bounce_rate'];
      const { payload } = await buildExperimentPayload(template, context);

      const metrics = payload.secondary_metrics as Array<Record<string, unknown>>;
      expect(metrics).toHaveLength(4);
      expect(metrics[0]).toEqual({ metric_id: 11, type: 'secondary', order_index: 0 });
      expect(metrics[1]).toEqual({ metric_id: 14, type: 'secondary', order_index: 1 });
      expect(metrics[2]).toEqual({ metric_id: 12, type: 'guardrail', order_index: 2 });
      expect(metrics[3]).toEqual({ metric_id: 13, type: 'exploratory', order_index: 3 });
    });
  });

  describe('feature flag roundtrip', () => {
    it('should preserve type=feature through export/parse/build', async () => {
      const experiment = makeExperiment({ type: 'feature' });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      expect(template.type).toBe('feature');
      expect(payload.type).toBe('feature');
    });

    it('should use feature-specific custom section fields for type=feature', async () => {
      const experiment = makeExperiment({ type: 'feature' });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      template.custom_fields = { 'Rollout Plan': 'Gradual 10% -> 50% -> 100%' };
      const { payload } = await buildExperimentPayload(template, context);

      const customValues = payload.custom_section_field_values as Record<
        string,
        { type: string; value: string }
      >;
      expect(customValues[310]).toEqual({ type: 'string', value: 'Gradual 10% -> 50% -> 100%' });
      expect(customValues[300]).toBeUndefined();
    });
  });

  describe('archived metrics', () => {
    it('should resolve an archived metric name correctly', async () => {
      const experiment = makeExperiment({
        primary_metric: { metric_id: 15, name: 'archived_metric' },
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.primary_metric).toBe('archived_metric');

      const { payload } = await buildExperimentPayload(template, context);
      expect(payload.primary_metric).toEqual({ metric_id: 15 });
    });
  });

  describe('owners by email', () => {
    it('should resolve Name <email> format to user_id', async () => {
      const experiment = makeExperiment({
        owners: [
          {
            user_id: 100,
            user: { first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com' },
          },
          {
            user_id: 101,
            user: { first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com' },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.owners).toHaveLength(2);
      expect(template.owners![0]).toContain('alice@example.com');
      expect(template.owners![1]).toContain('bob@example.com');

      const { payload } = await buildExperimentPayload(template, context);
      expect(payload.owners).toEqual([{ user_id: 100 }, { user_id: 101 }]);
    });

    it('should warn when owner email is not found', async () => {
      const experiment = makeExperiment({
        owners: [
          {
            user_id: 999,
            user: { first_name: 'Unknown', last_name: 'User', email: 'unknown@example.com' },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      const { warnings } = await buildExperimentPayload(template, context);
      expect(warnings.some((w) => w.includes('not found'))).toBe(true);
    });
  });

  describe('teams and tags', () => {
    it('should resolve team names to IDs through roundtrip', async () => {
      const experiment = makeExperiment({
        teams: [
          { team_id: 50, team: { name: 'Growth' } },
          { team_id: 51, team: { name: 'Platform' } },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.teams).toEqual(['Growth', 'Platform']);

      const { payload } = await buildExperimentPayload(template, context);
      expect(payload.teams).toEqual([{ team_id: 50 }, { team_id: 51 }]);
    });

    it('should resolve tag names to IDs through roundtrip', async () => {
      const experiment = makeExperiment({
        experiment_tags: [
          { experiment_tag_id: 200, experiment_tag: { tag: 'pricing' } },
          { experiment_tag_id: 201, experiment_tag: { tag: 'onboarding' } },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.tags).toEqual(['pricing', 'onboarding']);

      const { payload } = await buildExperimentPayload(template, context);
      expect(payload.experiment_tags).toEqual([
        { experiment_tag_id: 200 },
        { experiment_tag_id: 201 },
      ]);
    });
  });

  describe('audience JSON block', () => {
    it('should export audience as JSON code block and parse back correctly', async () => {
      const audienceFilter = { filter: [{ and: [{ type: 'country', value: 'US' }] }] };
      const experiment = makeExperiment({
        audience: audienceFilter,
      });
      const markdown = await experimentToMarkdown(experiment);

      expect(markdown).toContain('## Audience');
      expect(markdown).toContain('```json');
      expect(markdown).toContain('"filter"');

      const template = parseExperimentMarkdown(markdown);
      const parsed = JSON.parse(template.audience!);
      expect(parsed).toEqual(audienceFilter);
    });

    it('should preserve audience through full roundtrip to payload', async () => {
      const audienceFilter = { filter: [{ and: [{ type: 'segment', value: 'beta' }] }] };
      const experiment = makeExperiment({
        audience: audienceFilter,
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      const payloadAudience = JSON.parse(payload.audience as string);
      expect(payloadAudience).toEqual(audienceFilter);
    });

    it('should handle string audience from the API', async () => {
      const audienceStr = '{"filter":[{"and":[]}]}';
      const experiment = makeExperiment({ audience: audienceStr });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      const parsed = JSON.parse(template.audience!);
      expect(parsed).toEqual(JSON.parse(audienceStr));
    });
  });

  describe('custom fields by section', () => {
    it('should export custom fields grouped by section and parse back', async () => {
      const experiment = makeExperiment({
        custom_section_field_values: [
          {
            value: 'Changing the button color increases CTR',
            custom_section_field: {
              title: 'Hypothesis',
              type: 'string',
              order_index: 0,
              custom_section: { title: 'Research', order_index: 0 },
            },
          },
          {
            value: 'high',
            custom_section_field: {
              title: 'Expected Impact',
              type: 'string',
              order_index: 1,
              custom_section: { title: 'Research', order_index: 0 },
            },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);

      expect(markdown).toContain('## Research');
      expect(markdown).toContain('### Hypothesis');
      expect(markdown).toContain('Changing the button color increases CTR');
      expect(markdown).toContain('### Expected Impact');
      expect(markdown).toContain('high');

      const template = parseExperimentMarkdown(markdown);
      expect(template.custom_fields!['Hypothesis']).toBe('Changing the button color increases CTR');
      expect(template.custom_fields!['Expected Impact']).toBe('high');
    });

    it('should resolve custom fields to IDs in the payload', async () => {
      const experiment = makeExperiment({
        custom_section_field_values: [
          {
            value: 'My hypothesis text',
            custom_section_field: {
              title: 'Hypothesis',
              type: 'string',
              order_index: 0,
              custom_section: { title: 'Details', order_index: 0 },
            },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      const customValues = payload.custom_section_field_values as Record<
        string,
        { type: string; value: string }
      >;
      expect(customValues[300]).toEqual({ type: 'string', value: 'My hypothesis text' });
    });

    it('should set user-type custom field to owner_id', async () => {
      const experiment = makeExperiment({
        custom_section_field_values: [],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      const customValues = payload.custom_section_field_values as Record<
        string,
        { type: string; value: string }
      >;
      expect(customValues[302]).toEqual({ type: 'user', value: '{"selected":[{"userId":100}]}' });
    });

    it('should warn when a custom field title does not match any known field', async () => {
      const markdown = `---
name: test-exp
type: test
---

## Custom Section

### Nonexistent Field

some value
`;
      const template = parseExperimentMarkdown(markdown);
      const { warnings } = await buildExperimentPayload(template, context);

      expect(warnings.some((w) => w.includes('Nonexistent Field'))).toBe(true);
    });
  });

  describe('screenshots', () => {
    it('should export variant screenshots as markdown images', async () => {
      const experiment = makeExperiment({
        variant_screenshots: [
          {
            variant: 0,
            label: 'Control screenshot',
            file_upload: {
              base_url: '/uploads',
              file_name: 'control.png',
            },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);

      expect(markdown).toContain('![Control screenshot](/uploads/control.png)');

      const template = parseExperimentMarkdown(markdown);
      expect(template.variants![0]!.screenshot).toBe('/uploads/control.png');
      expect(template.variants![0]!.screenshot_label).toBe('Control screenshot');
    });

    it('should export variant screenshots with empty label', async () => {
      const experiment = makeExperiment({
        variant_screenshots: [
          {
            variant: 0,
            file_upload: {
              base_url: '/uploads',
              file_name: 'control.png',
            },
          },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);

      expect(markdown).toContain('![](/uploads/control.png)');

      const template = parseExperimentMarkdown(markdown);
      expect(template.variants![0]!.screenshot).toBe('/uploads/control.png');
      expect(template.variants![0]!.screenshot_label).toBeUndefined();
    });

    it('should build payload with screenshot from file path via screenshot: syntax', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(pngBuffer);

      const template = parseExperimentMarkdown(`---
name: screenshot-test
type: test
---

## Variants

### variant_0

name: control
screenshot: /tmp/control.png

### variant_1

name: treatment
`);

      const { payload } = await buildExperimentPayload(template, context);
      const screenshots = payload.variant_screenshots as Array<Record<string, unknown>>;

      expect(screenshots).toHaveLength(1);
      expect(screenshots[0]!.variant).toBe(0);

      const fileUpload = screenshots[0]!.file_upload as Record<string, unknown>;
      expect(fileUpload.file_name).toBe('control.png');
      expect(fileUpload.content_type).toBe('image/png');
    });

    it('should build payload with screenshot from markdown image syntax', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(pngBuffer);

      const template = parseExperimentMarkdown(`---
name: screenshot-md-test
type: test
---

## Variants

### variant_0

name: control
![Control variant](/tmp/control.png)

### variant_1

name: treatment
`);

      expect(template.variants![0]!.screenshot).toBe('/tmp/control.png');
      expect(template.variants![0]!.screenshot_label).toBe('Control variant');

      const { payload } = await buildExperimentPayload(template, context);
      const screenshots = payload.variant_screenshots as Array<Record<string, unknown>>;

      expect(screenshots).toHaveLength(1);
      expect(screenshots[0]!.variant).toBe(0);
      expect(screenshots[0]!.label).toBe('Control variant');

      const fileUpload = screenshots[0]!.file_upload as Record<string, unknown>;
      expect(fileUpload.file_name).toBe('control.png');
      expect(fileUpload.content_type).toBe('image/png');
    });

    it('should handle data URI screenshots through roundtrip', async () => {
      const dataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const template = parseExperimentMarkdown(`---
name: data-uri-test
type: test
---

## Variants

### variant_0

name: control
screenshot: ${dataUri}
`);

      expect(template.variants![0]!.screenshot).toBe(dataUri);

      const { payload } = await buildExperimentPayload(template, context);
      const screenshots = payload.variant_screenshots as Array<Record<string, unknown>>;

      expect(screenshots).toHaveLength(1);
      const fileUpload = screenshots[0]!.file_upload as Record<string, unknown>;
      expect(fileUpload.content_type).toBe('image/png');
      expect(fileUpload.file_name).toBe('control.png');
    });
  });

  describe('edge cases', () => {
    it('should handle experiment with no optional fields', async () => {
      const experiment = {
        id: 1 as any,
        name: 'minimal-exp',
        variants: [
          { name: 'control', variant: 0 },
          { name: 'treatment', variant: 1 },
        ],
      } as any;

      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      expect(payload.name).toBe('minimal-exp');
      expect(payload.type).toBe('test');
      const variants = payload.variants as Array<Record<string, unknown>>;
      expect(variants).toHaveLength(2);
    });

    it('should handle multiple applications', async () => {
      const experiment = makeExperiment({
        applications: [
          { application_id: 1, application: { name: 'web' }, application_version: '0' },
          { application_id: 2, application: { name: 'mobile' }, application_version: '0' },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);

      expect(markdown).toContain('application: web, mobile');

      const template = parseExperimentMarkdown(markdown);
      expect(template.application).toBe('web, mobile');
    });

    it('should handle variant with empty config', async () => {
      const experiment = makeExperiment({
        variants: [
          { name: 'control', variant: 0 },
          { name: 'treatment', variant: 1 },
        ],
      });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      const variants = payload.variants as Array<Record<string, unknown>>;
      expect(variants[0]!.config).toBe('{}');
      expect(variants[1]!.config).toBe('{}');
    });

    it('should default type to test when not specified', async () => {
      const experiment = makeExperiment();
      delete (experiment as any).type;

      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);

      expect(template.type).toBe('test');
    });

    it('should preserve complex audience filters', async () => {
      const complexAudience = {
        filter: [
          {
            or: [
              { type: 'country', op: 'in', value: ['US', 'GB', 'CA'] },
              { type: 'segment', op: 'eq', value: 'premium' },
            ],
          },
          {
            and: [{ type: 'device', op: 'eq', value: 'mobile' }],
          },
        ],
      };

      const experiment = makeExperiment({ audience: complexAudience });
      const markdown = await experimentToMarkdown(experiment);
      const template = parseExperimentMarkdown(markdown);
      const { payload } = await buildExperimentPayload(template, context);

      const payloadAudience = JSON.parse(payload.audience as string);
      expect(payloadAudience).toEqual(complexAudience);
    });
  });
});
