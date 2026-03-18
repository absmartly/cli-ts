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
    applications: [{ application_id: 10, name: 'web', application_version: '0' }],
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
    expect(md).toContain('display_name: Test Experiment');
    expect(md).toContain('type: test');
    expect(md).toContain('state: running');
    expect(md).toContain('percentage_of_traffic: 100');
    expect(md).toContain('percentages: 50/50');
  });

  it('should include unit type and application by name', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('## Unit & Application');
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

  it('should include metrics section', () => {
    const md = experimentToMarkdown(makeExperiment());

    expect(md).toContain('## Metrics');
    expect(md).toContain('primary_metric: clicks');
    expect(md).toContain('  - revenue');
  });

  it('should include guardrail metrics', () => {
    const md = experimentToMarkdown(makeExperiment({
      guardrail_metrics: [{ metric_id: 40, name: 'latency' }],
    }));

    expect(md).toContain('guardrail_metrics:');
    expect(md).toContain('  - latency');
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

  it('should include description and hypothesis', () => {
    const md = experimentToMarkdown(makeExperiment({
      description: 'A test experiment',
      hypothesis: 'Users will click more',
    }));

    expect(md).toContain('## Description');
    expect(md).toContain('hypothesis: Users will click more');
    expect(md).toContain('description: A test experiment');
  });

  it('should include owner_id from owners array', () => {
    const md = experimentToMarkdown(makeExperiment({
      owners: [{ user_id: 42 }],
    }));

    expect(md).toContain('owner_id: 42');
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
      description: undefined,
      hypothesis: undefined,
    }));

    expect(md).not.toContain('## Unit & Application');
    expect(md).not.toContain('## Metrics');
    expect(md).not.toContain('## Variants');
    expect(md).not.toContain('## Description');
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
    const experiment = makeExperiment({
      description: 'Round trip test',
      hypothesis: 'It works',
    });

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
    expect(parsed.hypothesis).toBe('It works');
    expect(parsed.description).toBe('Round trip test');
  });
});
