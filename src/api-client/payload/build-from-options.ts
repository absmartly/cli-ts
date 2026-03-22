import { buildSecondaryMetrics } from './metrics-builder.js';
import { parseCSV } from './parse-csv.js';
import { parseScreenshotEntries } from './screenshot-parser.js';
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
    data.variant_screenshots = await parseScreenshotEntries(input.screenshot, variants);
  }

  if (input.ownerIds && input.ownerIds.length > 0) {
    data.owners = input.ownerIds.map(id => ({ user_id: id }));
  }

  if (client) {
    if (input.secondaryMetrics || input.guardrailMetrics || input.exploratoryMetrics) {
      const allNames = [
        ...parseCSV(input.secondaryMetrics),
        ...parseCSV(input.guardrailMetrics),
        ...parseCSV(input.exploratoryMetrics),
      ];
      const resolved = await client.resolveMetrics(allNames);
      const byName = new Map(allNames.map((name, i) => [name, resolved[i]!]));

      data.secondary_metrics = buildSecondaryMetrics({
        secondary: parseCSV(input.secondaryMetrics).map(n => byName.get(n)!),
        guardrail: parseCSV(input.guardrailMetrics).map(n => byName.get(n)!),
        exploratory: parseCSV(input.exploratoryMetrics).map(n => byName.get(n)!),
      });
    }

    if (input.teams) {
      const resolved = await client.resolveTeams(parseCSV(input.teams));
      data.teams = resolved.map(t => ({ team_id: t.id }));
    }

    if (input.tags) {
      const resolved = await client.resolveTags(parseCSV(input.tags));
      data.experiment_tags = resolved.map(t => ({ experiment_tag_id: t.id }));
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
