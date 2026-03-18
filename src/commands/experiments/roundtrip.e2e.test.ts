import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createCommand } from './create.js';
import { getCommand } from './get.js';
import { getAPIClientFromOptions, getGlobalOptions, resolveAPIKey, printFormatted } from '../../lib/utils/api-helper.js';
import { resetCommand } from '../../test/helpers/command-reset.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';

vi.mock('../../lib/utils/api-helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/utils/api-helper.js')>();
  return {
    ...actual,
    getAPIClientFromOptions: vi.fn(),
    getGlobalOptions: vi.fn(),
    resolveAPIKey: vi.fn(),
    printFormatted: vi.fn(),
  };
});

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

describe('experiment round-trip (create -> get -> modify -> re-create)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const tmpDir = join(process.cwd(), '.test-roundtrip');
  const templateFile = join(tmpDir, 'full-experiment.md');
  const screenshotFile = join(tmpDir, 'variant-screenshot.png');
  const modifiedFile = join(tmpDir, 'modified-experiment.md');

  let createdExperiments: Array<Record<string, unknown>> = [];

  const fullExperimentResponse = {
    id: 42,
    name: 'full-roundtrip-test',
    display_name: 'Full Roundtrip Test',
    type: 'test',
    state: 'running',
    percentage_of_traffic: 80,
    percentages: '40/60',
    analysis_type: 'group_sequential',
    required_alpha: '0.05',
    required_power: '0.9',
    baseline_participants_per_day: '500',
    unit_type: { unit_type_id: 1, name: 'user_id' },
    applications: [{ application_id: 10, name: 'web', application_version: '1.0' }],
    primary_metric: { metric_id: 30, name: 'conversion_rate' },
    secondary_metrics: [
      { metric_id: 31, name: 'revenue_per_user', type: 'secondary', order_index: 0 },
      { metric_id: 32, name: 'session_duration', type: 'secondary', order_index: 1 },
    ],
    guardrail_metrics: [
      { metric_id: 40, name: 'error_rate' },
    ],
    variants: [
      { name: 'control', variant: 0, config: '{"button_color":"blue","cta_text":"Sign Up"}' },
      { name: 'treatment_a', variant: 1, config: '{"button_color":"green","cta_text":"Get Started"}' },
      { name: 'treatment_b', variant: 2, config: '{"button_color":"red","cta_text":"Join Now"}' },
    ],
    variant_screenshots: [
      {
        experiment_id: 42,
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
      {
        experiment_id: 42,
        variant: 1,
        screenshot_file_upload_id: 101,
        label: 'treatment_a.png',
        file_upload: {
          id: 101,
          file_usage_id: 2,
          file_name: 'treatment_a.png',
          file_size: 1200,
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
    owners: [{ user_id: 5 }],
    description: 'Testing the full round-trip workflow with all fields',
    hypothesis: 'A green CTA button will increase conversion by 15%',
  };

  const mockClient = {
    createExperiment: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      createdExperiments.push(data);
      return Promise.resolve({ ...fullExperimentResponse, ...data, id: 42 + createdExperiments.length });
    }),
    getExperiment: vi.fn().mockResolvedValue(fullExperimentResponse),
    listApplications: vi.fn().mockResolvedValue([
      { id: 10, name: 'web' },
      { id: 11, name: 'mobile' },
    ]),
    listUnitTypes: vi.fn().mockResolvedValue([
      { id: 1, name: 'user_id' },
      { id: 2, name: 'device_id' },
    ]),
    listMetrics: vi.fn().mockResolvedValue([
      { id: 30, name: 'conversion_rate' },
      { id: 31, name: 'revenue_per_user' },
      { id: 32, name: 'session_duration' },
      { id: 40, name: 'error_rate' },
    ]),
    listCustomSectionFields: vi.fn().mockResolvedValue([]),
    listExperimentActivity: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createdExperiments = [];
    resetCommand(createCommand);
    resetCommand(getCommand);
    vi.mocked(getAPIClientFromOptions).mockResolvedValue(mockClient as any);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);
    vi.mocked(resolveAPIKey).mockResolvedValue('test-api-key');
    vi.mocked(printFormatted).mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`process.exit: ${code}`);
    });

    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    for (const f of [templateFile, screenshotFile, modifiedFile]) {
      if (existsSync(f)) unlinkSync(f);
    }
  });

  it('should create experiment from comprehensive template with all fields including screenshots', async () => {
    writeFileSync(screenshotFile, Buffer.from(TINY_PNG_BASE64, 'base64'));

    writeFileSync(templateFile, `---
name: full-roundtrip-test
display_name: Full Roundtrip Test
type: test
state: created
percentage_of_traffic: 80
percentages: 40/60
analysis_type: group_sequential
required_alpha: "0.05"
required_power: "0.9"
baseline_participants: "500"
secondary_metrics:
  - revenue_per_user
  - session_duration
guardrail_metrics:
  - error_rate
---

## Unit & Application

unit_type: user_id
application: web

## Metrics

primary_metric: conversion_rate

## Variants

### variant_0

name: control
config: {"button_color":"blue","cta_text":"Sign Up"}
screenshot: data:image/png;base64,${TINY_PNG_BASE64}

### variant_1

name: treatment_a
config: {"button_color":"green","cta_text":"Get Started"}
screenshot: ${screenshotFile}

### variant_2

name: treatment_b
config: {"button_color":"red","cta_text":"Join Now"}

## Description

hypothesis: A green CTA button will increase conversion by 15%
description: Testing the full round-trip workflow with all fields
`, 'utf8');

    await createCommand.parseAsync(['node', 'test', '--from-file', templateFile]);

    expect(mockClient.createExperiment).toHaveBeenCalledOnce();
    const payload = createdExperiments[0];

    expect(payload.name).toBe('full-roundtrip-test');
    expect(payload.display_name).toBe('Full Roundtrip Test');
    expect(payload.type).toBe('test');
    expect(payload.state).toBe('created');
    expect(payload.traffic).toBe(80);
    expect(payload.percentages).toBe('40/60');
    expect(payload.analysis_type).toBe('group_sequential');
    expect(payload.required_alpha).toBe('0.05');
    expect(payload.required_power).toBe('0.9');
    expect(payload.baseline_participants_per_day).toBe('500');

    expect(payload.unit_type).toEqual({ unit_type_id: 1 });
    expect(payload.applications).toEqual([{ application_id: 10, application_version: '0' }]);
    expect(payload.primary_metric).toEqual({ metric_id: 30 });

    const variants = payload.variants as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(3);
    expect(variants[0]).toEqual({ name: 'control', variant: 0, config: '{"button_color":"blue","cta_text":"Sign Up"}' });
    expect(variants[1]).toEqual({ name: 'treatment_a', variant: 1, config: '{"button_color":"green","cta_text":"Get Started"}' });
    expect(variants[2]).toEqual({ name: 'treatment_b', variant: 2, config: '{"button_color":"red","cta_text":"Join Now"}' });

    const screenshots = payload.variant_screenshots as Array<Record<string, unknown>>;
    expect(screenshots).toHaveLength(2);
    expect(screenshots[0].variant).toBe(0);
    expect((screenshots[0].file_upload as Record<string, unknown>).content_type).toBe('image/png');
    expect(screenshots[1].variant).toBe(1);
    expect((screenshots[1].file_upload as Record<string, unknown>).file_name).toBe('variant-screenshot.png');

    expect(payload.hypothesis).toBe('A green CTA button will increase conversion by 15%');
    expect(payload.description).toBe('Testing the full round-trip workflow with all fields');
  });

  it('should export experiment as markdown template and re-create with modified name', async () => {
    const exportedMd = experimentToMarkdown(fullExperimentResponse as any);

    expect(exportedMd).toContain('name: full-roundtrip-test');
    expect(exportedMd).toContain('display_name: Full Roundtrip Test');
    expect(exportedMd).toContain('type: test');
    expect(exportedMd).toContain('percentage_of_traffic: 80');
    expect(exportedMd).toContain('percentages: 40/60');
    expect(exportedMd).toContain('unit_type: user_id');
    expect(exportedMd).toContain('application: web');
    expect(exportedMd).toContain('primary_metric: conversion_rate');
    expect(exportedMd).toContain('  - revenue_per_user');
    expect(exportedMd).toContain('  - session_duration');
    expect(exportedMd).toContain('  - error_rate');
    expect(exportedMd).toContain('### variant_0');
    expect(exportedMd).toContain('### variant_1');
    expect(exportedMd).toContain('### variant_2');
    expect(exportedMd).toContain('config: {"button_color":"blue","cta_text":"Sign Up"}');
    expect(exportedMd).toContain('screenshot: /files/variant_screenshots/abc123/control.png');
    expect(exportedMd).toContain('screenshot: /files/variant_screenshots/def456/treatment_a.png');
    expect(exportedMd).toContain('hypothesis: A green CTA button will increase conversion by 15%');
    expect(exportedMd).toContain('owner_id: 5');

    const parsed = parseExperimentMarkdown(exportedMd);
    expect(parsed.name).toBe('full-roundtrip-test');
    expect(parsed.display_name).toBe('Full Roundtrip Test');
    expect(parsed.unit_type).toBe('user_id');
    expect(parsed.application).toBe('web');
    expect(parsed.primary_metric).toBe('conversion_rate');
    expect(parsed.variants).toHaveLength(3);
    expect(parsed.variants![0].config).toBe('{"button_color":"blue","cta_text":"Sign Up"}');
    expect(parsed.variants![0].screenshot).toBe('/files/variant_screenshots/abc123/control.png');

    const modifiedMd = exportedMd
      .replace('name: full-roundtrip-test', 'name: cloned-experiment')
      .replace('display_name: Full Roundtrip Test', 'display_name: Cloned Experiment')
      .replace(/screenshot: \/files\/.*\n/g, '');

    writeFileSync(modifiedFile, modifiedMd, 'utf8');

    resetCommand(createCommand);
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'table' } as any);

    await createCommand.parseAsync(['node', 'test', '--from-file', modifiedFile]);

    expect(mockClient.createExperiment).toHaveBeenCalledOnce();
    const payload = createdExperiments[0];
    expect(payload.name).toBe('cloned-experiment');
    expect(payload.display_name).toBe('Cloned Experiment');

    expect(payload.type).toBe('test');
    expect(payload.unit_type).toEqual({ unit_type_id: 1 });
    expect(payload.applications).toEqual([{ application_id: 10, application_version: '0' }]);
    expect(payload.primary_metric).toEqual({ metric_id: 30 });
    expect((payload.variants as Array<Record<string, unknown>>)).toHaveLength(3);
  });

  it('should use --output template via get command', async () => {
    vi.mocked(getGlobalOptions).mockReturnValue({ output: 'template' } as any);

    await getCommand.parseAsync(['node', 'test', '42']);

    expect(mockClient.getExperiment).toHaveBeenCalledWith(42);
    expect(printFormatted).not.toHaveBeenCalled();

    const output = consoleSpy.mock.calls.flat().join('');
    expect(output).toContain('name: full-roundtrip-test');
    expect(output).toContain('### variant_0');
    expect(output).toContain('screenshot:');
  });
});
