import { resolveScreenshot } from '../template/screenshot.js';
import { resolveBySearch } from './search-resolver.js';
import { resolveByName } from './resolver.js';
import type { APIClient } from '../api-client.js';
import {
  DEFAULT_ANALYSIS_TYPE, DEFAULT_STATE, DEFAULT_TRAFFIC,
  DEFAULT_REQUIRED_ALPHA, DEFAULT_REQUIRED_POWER, DEFAULT_FUTILITY_TYPE,
  DEFAULT_MIN_ANALYSIS_INTERVAL, DEFAULT_FIRST_ANALYSIS_INTERVAL,
  DEFAULT_MAX_DURATION_INTERVAL, DEFAULT_BASELINE_PARTICIPANTS, DEFAULT_AUDIENCE,
  DEFAULT_CONTROL_NAME, DEFAULT_TREATMENT_NAME,
} from './defaults.js';

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
  secondaryMetrics?: string;
  guardrailMetrics?: string;
  exploratoryMetrics?: string;
  teams?: string;
  tags?: string;
  audience?: string;
  analysisType?: string;
  requiredAlpha?: string;
  requiredPower?: string;
  baselineParticipants?: string;
}

function parseCSV(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export async function buildPayloadFromOptions(input: CreateFromOptionsInput, client?: APIClient): Promise<Record<string, unknown>> {
  const variantNames = input.variants ? input.variants.split(',').map(n => n.trim()) : [DEFAULT_CONTROL_NAME, DEFAULT_TREATMENT_NAME];
  const variantConfigs: string[] = input.variantConfig || [];
  const variants = variantNames.map((name, index) => ({
    name,
    variant: index,
    config: variantConfigs[index] || JSON.stringify({}),
  }));

  const percentages = input.percentages
    ? input.percentages.split(',').map(p => parseInt(p.trim(), 10))
    : variantNames.map(() => Math.floor(100 / variantNames.length));

  const data: Record<string, unknown> = {
    name: input.name,
    display_name: input.displayName || input.name,
    type: input.type || 'test',
    state: input.state || DEFAULT_STATE,
    percentages: percentages.join('/'),
    percentage_of_traffic: input.percentageOfTraffic ?? DEFAULT_TRAFFIC,
    audience: input.audience || DEFAULT_AUDIENCE,
    audience_strict: false,
    analysis_type: input.analysisType || DEFAULT_ANALYSIS_TYPE,
    required_alpha: input.requiredAlpha || DEFAULT_REQUIRED_ALPHA,
    required_power: input.requiredPower || DEFAULT_REQUIRED_POWER,
    group_sequential_futility_type: DEFAULT_FUTILITY_TYPE,
    group_sequential_min_analysis_interval: DEFAULT_MIN_ANALYSIS_INTERVAL,
    group_sequential_first_analysis_interval: DEFAULT_FIRST_ANALYSIS_INTERVAL,
    group_sequential_max_duration_interval: DEFAULT_MAX_DURATION_INTERVAL,
    baseline_participants_per_day: input.baselineParticipants || DEFAULT_BASELINE_PARTICIPANTS,
    nr_variants: variants.length,
    variants,
    variant_screenshots: [] as Array<Record<string, unknown>>,
    secondary_metrics: [] as Array<Record<string, unknown>>,
    teams: [] as Array<Record<string, unknown>>,
    experiment_tags: [] as Array<Record<string, unknown>>,
  };

  if (input.unitType) {
    data.unit_type = { unit_type_id: input.unitType };
  }
  if (input.applicationId) {
    data.applications = [{ application_id: input.applicationId, application_version: '0' }];
  }
  if (input.primaryMetric) {
    data.primary_metric = { metric_id: input.primaryMetric };
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
    data.variant_screenshots = screenshots;
  }

  if (input.ownerIds && input.ownerIds.length > 0) {
    data.owners = input.ownerIds.map(id => ({ user_id: id }));
  }

  if (client) {
    const needsMetricResolution = input.secondaryMetrics || input.guardrailMetrics || input.exploratoryMetrics;
    if (needsMetricResolution) {
      const allNames = [
        ...parseCSV(input.secondaryMetrics),
        ...parseCSV(input.guardrailMetrics),
        ...parseCSV(input.exploratoryMetrics),
      ];
      const metrics = await resolveBySearch(allNames, name => client.listMetrics({ search: name, archived: true }));

      const allMetrics: Array<{ metric_id: number; type: string; order_index: number }> = [];
      let orderIndex = 0;
      for (const name of parseCSV(input.secondaryMetrics)) {
        const metric = resolveByName(metrics, name, 'Secondary metric');
        allMetrics.push({ metric_id: metric.id, type: 'secondary', order_index: orderIndex++ });
      }
      for (const name of parseCSV(input.guardrailMetrics)) {
        const metric = resolveByName(metrics, name, 'Guardrail metric');
        allMetrics.push({ metric_id: metric.id, type: 'guardrail', order_index: orderIndex++ });
      }
      for (const name of parseCSV(input.exploratoryMetrics)) {
        const metric = resolveByName(metrics, name, 'Exploratory metric');
        allMetrics.push({ metric_id: metric.id, type: 'exploratory', order_index: orderIndex++ });
      }
      data.secondary_metrics = allMetrics;
    }

    if (input.teams) {
      const teamNames = parseCSV(input.teams);
      const allTeams = await client.listTeams();
      data.teams = teamNames.map(name => {
        const team = allTeams.find(t => t.name.toLowerCase() === name.trim().toLowerCase() || String(t.id) === name.trim());
        if (!team) throw new Error(`Team "${name}" not found`);
        return { team_id: team.id };
      });
    }

    if (input.tags) {
      const tagNames = parseCSV(input.tags);
      const allTags = await client.listExperimentTags();
      data.experiment_tags = tagNames.map(name => {
        const tag = allTags.find(t => t.tag.toLowerCase() === name.trim().toLowerCase() || String(t.id) === name.trim());
        if (!tag) throw new Error(`Tag "${name}" not found`);
        return { experiment_tag_id: tag.id };
      });
    }

    const customFields = await client.listCustomSectionFields();
    const expType = (input.type || 'test') as string;
    const relevantFields = customFields.filter(
      f => !f.archived && f.custom_section?.type === expType && !f.custom_section?.archived
    );
    if (relevantFields.length > 0) {
      const ownerId = input.ownerIds?.[0];
      const fieldValues: Record<string, { type: string; value: string }> = {};
      for (const field of relevantFields) {
        let value = field.default_value ?? '';
        if (field.type === 'user' && ownerId) {
          value = JSON.stringify({ selected: [{ userId: ownerId }] });
        }
        fieldValues[field.id] = { type: field.type, value };
      }
      data.custom_section_field_values = fieldValues;
    }
  }

  return data;
}
