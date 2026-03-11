import type { ExperimentTemplate, VariantTemplate } from '../template/parser.js';
import { resolveByName, type ResolverContext } from './resolver.js';

const DEFAULT_ANALYSIS_TYPE = 'group_sequential';
const DEFAULT_PERCENTAGES = '50/50';
const DEFAULT_TYPE = 'test';
const DEFAULT_STATE = 'ready';
const DEFAULT_TRAFFIC = 100;
const DEFAULT_REQUIRED_ALPHA = '0.1';
const DEFAULT_REQUIRED_POWER = '0.8';
const DEFAULT_FUTILITY_TYPE = 'binding';
const DEFAULT_MIN_ANALYSIS_INTERVAL = '1d';
const DEFAULT_FIRST_ANALYSIS_INTERVAL = '7d';
const DEFAULT_MAX_DURATION_INTERVAL = '6w';
const DEFAULT_BASELINE_PARTICIPANTS = '33';
const DEFAULT_AUDIENCE = '{"filter":[{"and":[]}]}';
const DEFAULT_CONTROL_NAME = 'control';
const DEFAULT_TREATMENT_NAME = 'treatment';
const CONFIG_PREVIEW_LENGTH = 100;

function parseVariantConfig(variant: VariantTemplate, index: number): string {
  if (!variant.config) {
    return JSON.stringify({});
  }

  try {
    const parsed = JSON.parse(variant.config);
    return JSON.stringify(parsed);
  } catch (error) {
    const preview = variant.config.substring(0, CONFIG_PREVIEW_LENGTH);
    const suffix = variant.config.length > CONFIG_PREVIEW_LENGTH ? '...' : '';
    throw new Error(
      `Invalid JSON in variant "${variant.name}" (variant ${index}):\n` +
      `${error instanceof Error ? error.message : 'unknown error'}\n` +
      `Config: ${preview}${suffix}`,
    );
  }
}

function buildVariants(template: ExperimentTemplate): Array<Record<string, unknown>> {
  if (template.variants && template.variants.length > 0) {
    return template.variants.map((v, index) => ({
      name: v.name,
      variant: v.variant ?? index,
      config: parseVariantConfig(v, index),
    }));
  }

  return [
    { name: DEFAULT_CONTROL_NAME, variant: 0, config: JSON.stringify({}) },
    { name: DEFAULT_TREATMENT_NAME, variant: 1, config: JSON.stringify({}) },
  ];
}

function buildCustomSectionFieldValues(
  context: ResolverContext,
  experimentType: string,
  ownerId: number | undefined,
): Record<string, { type: string; value: string }> | undefined {
  if (!context.customSectionFields || context.customSectionFields.length === 0) {
    return undefined;
  }

  const relevantFields = context.customSectionFields.filter(
    (f) => !f.archived && f.custom_section?.type === experimentType && !f.custom_section?.archived,
  );

  if (relevantFields.length === 0) {
    return undefined;
  }

  const fieldValues: Record<string, { type: string; value: string }> = {};
  for (const field of relevantFields) {
    let value = field.default_value ?? '';
    if (field.type === 'user' && ownerId) {
      value = String(ownerId);
    }
    fieldValues[field.id] = { type: field.type, value };
  }

  return fieldValues;
}

export function buildExperimentPayload(
  template: ExperimentTemplate,
  context: ResolverContext,
): Record<string, unknown> {
  const experimentType = template.type ?? DEFAULT_TYPE;
  const variants = buildVariants(template);

  const payload: Record<string, unknown> = {
    name: template.name,
    display_name: template.display_name ?? template.name,
    type: experimentType,
    state: template.state ?? DEFAULT_STATE,
    traffic: template.percentage_of_traffic ?? DEFAULT_TRAFFIC,
    percentages: template.percentages ?? DEFAULT_PERCENTAGES,
    analysis_type: template.analysis_type ?? DEFAULT_ANALYSIS_TYPE,
    required_alpha: template.required_alpha ?? DEFAULT_REQUIRED_ALPHA,
    required_power: template.required_power ?? DEFAULT_REQUIRED_POWER,
    group_sequential_futility_type: DEFAULT_FUTILITY_TYPE,
    group_sequential_min_analysis_interval: DEFAULT_MIN_ANALYSIS_INTERVAL,
    group_sequential_first_analysis_interval: DEFAULT_FIRST_ANALYSIS_INTERVAL,
    group_sequential_max_duration_interval: DEFAULT_MAX_DURATION_INTERVAL,
    baseline_participants_per_day: template.baseline_participants ?? DEFAULT_BASELINE_PARTICIPANTS,
    audience: DEFAULT_AUDIENCE,
    audience_strict: false,
    nr_variants: variants.length,
    variants,
    variant_screenshots: [],
    secondary_metrics: [],
    teams: [],
    experiment_tags: [],
  };

  if (template.application) {
    const app = resolveByName(context.applications, template.application, 'Application');
    payload.applications = [{ application_id: app.id, application_version: '0' }];
  }

  if (template.unit_type) {
    const unitType = resolveByName(context.unitTypes, template.unit_type, 'Unit type');
    payload.unit_type = { unit_type_id: unitType.id };
  }

  if (template.primary_metric) {
    const metric = resolveByName(context.metrics, template.primary_metric, 'Metric');
    payload.primary_metric = { metric_id: metric.id };
  }

  if (template.secondary_metrics && template.secondary_metrics.length > 0) {
    payload.secondary_metrics = template.secondary_metrics.map((name) => {
      const metric = resolveByName(context.metrics, name, 'Secondary metric');
      return { metric_id: metric.id };
    });
  }

  if (template.guardrail_metrics && template.guardrail_metrics.length > 0) {
    payload.guardrail_metrics = template.guardrail_metrics.map((name) => {
      const metric = resolveByName(context.metrics, name, 'Guardrail metric');
      return { metric_id: metric.id };
    });
  }

  let ownerId: number | undefined;
  if (template.owner_id) {
    ownerId = Number(template.owner_id);
    payload.owners = [{ user_id: ownerId }];
  }

  if (template.description) {
    payload.description = template.description;
  }

  if (template.hypothesis) {
    payload.hypothesis = template.hypothesis;
  }

  const customFieldValues = buildCustomSectionFieldValues(context, experimentType, ownerId);
  if (customFieldValues) {
    payload.custom_section_field_values = customFieldValues;
  }

  return payload;
}
