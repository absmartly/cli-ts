import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAPIClient } from '../../lib/api/client.js';
import { parseExperimentMarkdown } from '../../api-client/template/parser.js';
import { experimentToMarkdown } from '../../api-client/template/serializer.js';
import { buildExperimentPayload } from '../../api-client/payload/builder.js';
import { isLiveMode, TEST_BASE_URL, TEST_API_KEY } from '../../test/helpers/test-config.js';
import { fetchLiveMetadata } from '../../test/helpers/live-helpers.js';
import { createStatefulExperimentHandlers } from '../../test/helpers/stateful-handlers.js';
import type { ResolverContext } from '../../api-client/payload/resolver.js';

const client = createAPIClient(TEST_BASE_URL, TEST_API_KEY);
const createdIds: number[] = [];

afterAll(async () => {
  for (const id of createdIds) {
    try {
      await client.archiveExperiment(id);
    } catch {}
  }
});

describe('experiment round-trip: create → export → modify → update', () => {
  let context: ResolverContext;
  let experimentId: number;
  let exportedMarkdown: string;

  beforeAll(async () => {
    if (isLiveMode) return;
    const { server } = await import('../../test/mocks/server.js');
    server.use(...createStatefulExperimentHandlers(TEST_BASE_URL));
  });

  it('should build resolver context from API', async () => {
    const [apps, unitTypes, metrics, goals, customFields] = await Promise.all([
      client.listApplications(),
      client.listUnitTypes(),
      client.listMetrics({ archived: true }),
      client.listGoals(),
      client.listCustomSectionFields(),
    ]);

    context = { applications: apps, unitTypes, metrics, goals, customSectionFields: customFields };

    expect(apps.length).toBeGreaterThan(0);
    expect(unitTypes.length).toBeGreaterThan(0);
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should create experiment from markdown template', async () => {
    const appName = (context.applications[0] as Record<string, unknown>).name as string;
    const unitTypeName = (context.unitTypes[0] as Record<string, unknown>).name as string;
    const metricName = (context.metrics[0] as Record<string, unknown>).name as string;

    const markdown = `---
name: vitest_roundtrip_${Date.now()}
display_name: Roundtrip E2E Test
type: test
percentage_of_traffic: 80
percentages: 40/60
---

## Unit & Application

unit_type: ${unitTypeName}
application: ${appName}

## Metrics

primary_metric: ${metricName}

## Variants

### variant_0

name: control
config: {"color":"blue"}

### variant_1

name: treatment
config: {"color":"green"}

## Description

hypothesis: Green buttons convert better
description: Testing the full roundtrip flow
`;

    const template = parseExperimentMarkdown(markdown);
    expect(template.name).toContain('vitest_roundtrip_');
    expect(template.display_name).toBe('Roundtrip E2E Test');
    expect(template.variants).toHaveLength(2);

    const meta = await fetchLiveMetadata(client);
    const result = await buildExperimentPayload(template, context);
    const payload = result.payload;
    payload.owners = [{ user_id: meta.userId }];
    if (Object.keys(meta.customFieldValues).length > 0) {
      payload.custom_section_field_values = meta.customFieldValues;
    }

    const created = await client.createExperiment(payload);
    experimentId = created.id;
    createdIds.push(experimentId);

    expect(created.id).toBeGreaterThan(0);
    expect(created).toHaveProperty('name');
  });

  it('should export experiment to markdown and parse back (roundtrip)', async () => {
    const experiment = await client.getExperiment(experimentId);

    expect(experiment.id).toBe(experimentId);
    expect(experiment).toHaveProperty('variants');

    exportedMarkdown = await experimentToMarkdown(experiment as any);

    expect(exportedMarkdown).toContain('display_name: "Roundtrip E2E Test"');
    expect(exportedMarkdown).toContain('percentage_of_traffic: 80');
    expect(exportedMarkdown).toContain('percentages: 40/60');
    expect(exportedMarkdown).toContain('### variant_0');
    expect(exportedMarkdown).toContain('### variant_1');

    const parsed = parseExperimentMarkdown(exportedMarkdown);
    expect(parsed.display_name).toBe('Roundtrip E2E Test');
    expect(parsed.percentage_of_traffic).toBe(80);
    expect(parsed.variants).toHaveLength(2);
  });

  it('should update experiment from modified markdown template', async () => {
    const modifiedMd = exportedMarkdown
      .replace('display_name: "Roundtrip E2E Test"', 'display_name: "Updated Roundtrip Test"')
      .replace('percentage_of_traffic: 80', 'percentage_of_traffic: 60');

    const modifiedTemplate = parseExperimentMarkdown(modifiedMd);
    expect(modifiedTemplate.display_name).toBe('Updated Roundtrip Test');
    expect(modifiedTemplate.percentage_of_traffic).toBe(60);

    const updateData: Record<string, unknown> = {};
    if (modifiedTemplate.display_name !== undefined) updateData.display_name = modifiedTemplate.display_name;
    if (modifiedTemplate.percentage_of_traffic !== undefined) updateData.percentage_of_traffic = modifiedTemplate.percentage_of_traffic;

    const updated = await client.updateExperiment(experimentId, updateData);
    expect(updated.id).toBe(experimentId);
    expect(updated.display_name).toBe('Updated Roundtrip Test');
    expect(updated.percentage_of_traffic).toBe(60);
  });

  it('should verify update persisted by re-fetching', async () => {
    const experiment = await client.getExperiment(experimentId);

    expect(experiment.id).toBe(experimentId);
    expect(experiment.display_name).toBe('Updated Roundtrip Test');
    expect(experiment.percentage_of_traffic).toBe(60);

    const reExportedMd = await experimentToMarkdown(experiment as any);
    const reParsed = parseExperimentMarkdown(reExportedMd);

    expect(reParsed.display_name).toBe('Updated Roundtrip Test');
    expect(reParsed.percentage_of_traffic).toBe(60);
  });
});
