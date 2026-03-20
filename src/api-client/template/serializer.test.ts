import { describe, it, expect } from 'vitest';
import { experimentToMarkdown } from './serializer.js';
import { parseExperimentMarkdown } from './parser.js';
import type { Experiment } from '../types.js';

function makeExperiment(overrides: Partial<Record<string, unknown>> = {}): Experiment {
  return {
    id: 1 as any,
    name: 'test-experiment',
    display_name: 'Test Experiment',
    type: 'test',
    state: 'running',
    percentage_of_traffic: 100,
    percentages: '50/50',
    unit_type: { unit_type_id: 1, name: 'user_id' },
    applications: [{ application_id: 10, application: { name: 'web' }, application_version: '0' }],
    primary_metric: { metric_id: 30, name: 'clicks' },
    secondary_metrics: [
      { metric_id: 31, name: 'revenue', type: 'secondary', order_index: 0 },
    ],
    variants: [
      { name: 'control', variant: 0, config: '{"color":"red"}' },
      { name: 'treatment', variant: 1, config: '{"color":"blue"}' },
    ],
    ...overrides,
  } as Experiment;
}

describe('experimentToMarkdown', () => {
  it('should produce valid YAML frontmatter with core fields', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('---\n');
    expect(md).toContain('name: test-experiment');
    expect(md).toContain('display_name: "Test Experiment"');
    expect(md).toContain('type: test');
    expect(md).toContain('state: running');
    expect(md).toContain('percentage_of_traffic: 100');
    expect(md).toContain('percentages: 50/50');
  });

  it('should include unit type and application in frontmatter', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('unit_type: user_id');
    expect(md).toContain('application: web');
  });

  it('should fall back to IDs when names are missing', () => {
    const md = experimentToMarkdown(makeExperiment({
      unit_type: { unit_type_id: 5 },
      applications: [{ application_id: 20 }],
      primary_metric: { metric_id: 99 },
    }));

    expect(md).toContain('unit_type: 5');
    expect(md).toContain('application: 20');
    expect(md).toContain('primary_metric: 99');
  });

  it('should include primary and secondary metrics in frontmatter', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('primary_metric: clicks');
    expect(md).toContain('secondary_metrics:');
    expect(md).toContain('  - revenue');
  });

  it('should include guardrail metrics from secondary_metrics with type guardrail', () => {
    const md = experimentToMarkdown(makeExperiment({
      secondary_metrics: [
        { metric_id: 31, type: 'secondary', order_index: 0, metric: { name: 'revenue' } },
        { metric_id: 40, type: 'guardrail', order_index: 1, metric: { name: 'latency' } },
      ],
    }));

    expect(md).toContain('secondary_metrics:');
    expect(md).toContain('  - revenue');
    expect(md).toContain('guardrail_metrics:');
    expect(md).toContain('  - latency');
  });

  it('should include exploratory metrics from secondary_metrics with type exploratory', () => {
    const md = experimentToMarkdown(makeExperiment({
      secondary_metrics: [
        { metric_id: 31, type: 'secondary', order_index: 0, metric: { name: 'revenue' } },
        { metric_id: 50, type: 'exploratory', order_index: 1, metric: { name: 'page_views' } },
      ],
    }));

    expect(md).toContain('secondary_metrics:');
    expect(md).toContain('  - revenue');
    expect(md).toContain('exploratory_metrics:');
    expect(md).toContain('  - page_views');
  });

  it('should export custom fields grouped by section', () => {
    const md = experimentToMarkdown(makeExperiment({
      custom_section_field_values: [
        {
          experiment_custom_section_field_id: 1,
          type: 'text',
          value: 'Users will click more',
          custom_section_field: {
            id: 1, title: 'Hypothesis', order_index: 1,
            custom_section: { title: 'Description', order_index: 2 },
          },
        },
        {
          experiment_custom_section_field_id: 5,
          type: 'text',
          value: 'https://jira.example.com/IT-123',
          custom_section_field: {
            id: 5, title: 'JIRA URL', order_index: 1,
            custom_section: { title: 'JIRA', order_index: 1 },
          },
        },
      ],
    }));

    expect(md).toContain('## JIRA');
    expect(md).toContain('### JIRA URL');
    expect(md).toContain('https://jira.example.com/IT-123');
    expect(md).toContain('## Description');
    expect(md).toContain('### Hypothesis');
    expect(md).toContain('Users will click more');
    const jiraPos = md.indexOf('## JIRA');
    const descPos = md.indexOf('## Description');
    expect(jiraPos).toBeLessThan(descPos);
  });

  it('should include variants with config', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('## Variants');
    expect(md).toContain('### variant_0');
    expect(md).toContain('name: control');
    expect(md).toContain('config: {"color":"red"}');
    expect(md).toContain('### variant_1');
    expect(md).toContain('name: treatment');
    expect(md).toContain('config: {"color":"blue"}');
  });

  it('should serialize object config as JSON', () => {
    const md = experimentToMarkdown(makeExperiment({
      variants: [
        { name: 'control', variant: 0, config: { color: 'red' } },
      ],
    }));

    expect(md).toContain('config: {"color":"red"}');
  });

  it('should include owner email for single owner', () => {
    const md = experimentToMarkdown(makeExperiment({
      owners: [{ user_id: 42, user: { email: 'jane@example.com' } }],
    }));

    expect(md).toContain('owners:');
    expect(md).toContain('  - jane@example.com');
  });

  it('should include owner emails for multiple owners', () => {
    const md = experimentToMarkdown(makeExperiment({
      owners: [
        { user_id: 42, user: { email: 'jane@example.com' } },
        { user_id: 43, user: { email: 'john@example.com' } },
      ],
    }));

    expect(md).toContain('owners:');
    expect(md).toContain('  - jane@example.com');
    expect(md).toContain('  - john@example.com');
  });

  it('should fall back to user_id when user object is missing', () => {
    const md = experimentToMarkdown(makeExperiment({
      owners: [{ user_id: 42 }],
    }));

    expect(md).toContain('owners:');
    expect(md).toContain('  - 42');
  });

  it('should include teams', () => {
    const md = experimentToMarkdown(makeExperiment({
      teams: [
        { team: { name: 'Growth' } },
        { team: { name: 'Engineering' } },
      ],
    }));

    expect(md).toContain('teams:');
    expect(md).toContain('  - Growth');
    expect(md).toContain('  - Engineering');
  });

  it('should include tags', () => {
    const md = experimentToMarkdown(makeExperiment({
      experiment_tags: [
        { experiment_tag: { tag: 'q1' } },
        { experiment_tag: { tag: 'homepage' } },
      ],
    }));

    expect(md).toContain('tags:');
    expect(md).toContain('  - q1');
    expect(md).toContain('  - homepage');
  });

  it('should include audience as JSON block', () => {
    const md = experimentToMarkdown(makeExperiment({
      audience: '{"filter":[]}',
    }));

    expect(md).toContain('## Audience');
    expect(md).toContain('```json');
    expect(md).toContain('"filter": []');
    expect(md).toContain('```');
  });

  it('should include analysis config fields', () => {
    const md = experimentToMarkdown(makeExperiment({
      analysis_type: 'group_sequential',
      required_alpha: '0.05',
      required_power: '0.8',
      baseline_participants_per_day: '100',
    }));

    expect(md).toContain('analysis_type: group_sequential');
    expect(md).toContain('required_alpha: 0.05');
    expect(md).toContain('required_power: 0.8');
    expect(md).toContain('baseline_participants: 100');
  });

  it('should omit sections when data is absent', () => {
    const md = experimentToMarkdown(makeExperiment({
      unit_type: undefined,
      applications: undefined,
      primary_metric: undefined,
      secondary_metrics: undefined,
      variants: undefined,
    }));

    expect(md).not.toContain('unit_type:');
    expect(md).not.toContain('application:');
    expect(md).not.toContain('primary_metric:');
    expect(md).not.toContain('## Variants');
  });

  it('should include screenshot URL from variant_screenshots', () => {
    const md = experimentToMarkdown(makeExperiment({
      variant_screenshots: [
        {
          experiment_id: 1,
          variant: 0,
          screenshot_file_upload_id: 100,
          label: 'control.png',
          file_upload: {
            id: 100,
            file_usage_id: 2,
            file_name: 'control.png',
            file_size: 1000,
            content_type: 'image/png',
            base_url: '/files/variant_screenshots/abc123',
            width: 800,
            height: 600,
            crop_left: 0,
            crop_top: 0,
            crop_width: 800,
            crop_height: 600,
          },
        },
      ],
    }));

    expect(md).toContain('### variant_0');
    expect(md).toContain('screenshot: /files/variant_screenshots/abc123/control.png');
  });

  it('should match screenshot to correct variant', () => {
    const md = experimentToMarkdown(makeExperiment({
      variant_screenshots: [
        {
          experiment_id: 1,
          variant: 1,
          screenshot_file_upload_id: 200,
          label: 'treatment.png',
          file_upload: {
            id: 200,
            file_usage_id: 2,
            file_name: 'treatment.png',
            file_size: 2000,
            content_type: 'image/png',
            base_url: '/files/variant_screenshots/def456',
            width: 800,
            height: 600,
            crop_left: 0,
            crop_top: 0,
            crop_width: 800,
            crop_height: 600,
          },
        },
      ],
    }));

    const v0Section = md.split('### variant_0')[1]?.split('### variant_1')[0] ?? '';
    expect(v0Section).not.toContain('screenshot:');

    const v1Section = md.split('### variant_1')[1] ?? '';
    expect(v1Section).toContain('screenshot: /files/variant_screenshots/def456/treatment.png');
  });

  it('should produce output that round-trips through the parser', () => {
    const experiment = makeExperiment();

    const md = experimentToMarkdown(experiment);
    const parsed = parseExperimentMarkdown(md);

    expect(parsed.name).toBe('test-experiment');
    expect(parsed.display_name).toBe('Test Experiment');
    expect(parsed.type).toBe('test');
    expect(parsed.state).toBe('running');
    expect(parsed.percentage_of_traffic).toBe(100);
    expect(parsed.percentages).toBe('50/50');
    expect(parsed.unit_type).toBe('user_id');
    expect(parsed.application).toBe('web');
    expect(parsed.primary_metric).toBe('clicks');
    expect(parsed.variants).toHaveLength(2);
    expect(parsed.variants![0].name).toBe('control');
    expect(parsed.variants![0].config).toBe('{"color":"red"}');
    expect(parsed.variants![1].name).toBe('treatment');
  });
});
