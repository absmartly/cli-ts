import { resolveScreenshot } from '../template/screenshot.js';
import type { Experiment } from '../types.js';
import type { APIClient } from '../api-client.js';

export interface CreateFromOptionsInput {
  name: string;
  displayName?: string;
  type: string;
  state?: string;
  variants?: string;
  variantConfig?: string[];
  percentages?: string;
  percentageOfTraffic?: number;
  unitType?: number;
  applicationId?: number;
  primaryMetric?: number;
  screenshot?: string[];
  ownerIds?: number[];
}

export async function buildPayloadFromOptions(input: CreateFromOptionsInput, client?: APIClient): Promise<Partial<Experiment>> {
  const variantNames = input.variants ? input.variants.split(',').map((n: string) => n.trim()) : ['control', 'treatment'];
  const variantConfigs: string[] = input.variantConfig || [];
  const variants = variantNames.map((name: string, index: number) => ({
    name,
    variant: index,
    config: variantConfigs[index] || JSON.stringify({}),
  }));

  const percentages = input.percentages
    ? input.percentages.split(',').map((p: string) => parseInt(p.trim(), 10))
    : variantNames.map(() => Math.floor(100 / variantNames.length));

  const data: Partial<Experiment> = {
    name: input.name,
    display_name: input.displayName || input.name,
    type: input.type as 'test' | 'feature',
    state: input.state || 'ready',
    percentages: percentages.join('/'),
    percentage_of_traffic: input.percentageOfTraffic ?? 100,
    audience: '{"filter":[{"and":[]}]}',
    audience_strict: false,
    analysis_type: 'group_sequential',
    required_alpha: '0.1',
    required_power: '0.8',
    group_sequential_futility_type: 'binding',
    group_sequential_min_analysis_interval: '1d',
    group_sequential_first_analysis_interval: '7d',
    group_sequential_max_duration_interval: '6w',
    baseline_participants_per_day: '33',
    nr_variants: variants.length,
    variants,
    variant_screenshots: [],
    secondary_metrics: [],
    teams: [],
    experiment_tags: [],
  } as any;

  if (input.unitType) {
    (data as any).unit_type = { unit_type_id: input.unitType };
  }
  if (input.applicationId) {
    (data as any).applications = [{ application_id: input.applicationId, application_version: '0' }];
  }
  if (input.primaryMetric) {
    (data as any).primary_metric = { metric_id: input.primaryMetric };
  }
  if (input.screenshot && input.screenshot.length > 0) {
    const screenshots: Array<Record<string, unknown>> = [];
    for (const entry of input.screenshot) {
      const colonIdx = entry.indexOf(':');
      if (colonIdx === -1) {
        throw new Error(
          `Invalid --screenshot format: "${entry}"\n` +
          `Expected: <variant_index>:<file_path_or_url>\n` +
          `Example: --screenshot 0:./control.png --screenshot 1:https://example.com/treatment.png`
        );
      }
      const variantIdx = parseInt(entry.substring(0, colonIdx), 10);
      const source = entry.substring(colonIdx + 1);
      if (isNaN(variantIdx)) {
        throw new Error(`Invalid variant index in --screenshot: "${entry}"`);
      }
      const variantName = variants[variantIdx]?.name || `variant_${variantIdx}`;
      const resolved = await resolveScreenshot(source, variantName);
      if (resolved) {
        screenshots.push({ variant: variantIdx, file_upload: resolved });
      }
    }
    (data as any).variant_screenshots = screenshots;
  }

  if (input.ownerIds && input.ownerIds.length > 0) {
    (data as any).owners = input.ownerIds.map(id => ({ user_id: id }));
  }

  if (client) {
    const customFields = await client.listCustomSectionFields();
    const expType = input.type || 'test';
    const relevantFields = customFields.filter(
      (f: any) => !f.archived && f.custom_section?.type === expType && !f.custom_section?.archived
    );
    if (relevantFields.length > 0) {
      const ownerId = input.ownerIds?.[0];
      const fieldValues: Record<string, { type: string; value: string }> = {};
      for (const f of relevantFields) {
        let value = f.default_value ?? '';
        if (f.type === 'user' && ownerId) {
          value = JSON.stringify({ selected: [{ userId: ownerId }] });
        }
        fieldValues[f.id] = { type: f.type, value };
      }
      (data as any).custom_section_field_values = fieldValues;
    }
  }

  return data;
}
