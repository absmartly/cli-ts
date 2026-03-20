import type { ExperimentTemplate, VariantTemplate } from '../template/parser.js';
import { resolveByName, type ResolverContext } from './resolver.js';
import { resolveScreenshot } from '../template/screenshot.js';
import {
  DEFAULT_ANALYSIS_TYPE, DEFAULT_PERCENTAGES, DEFAULT_STATE, DEFAULT_TRAFFIC,
  DEFAULT_REQUIRED_ALPHA, DEFAULT_REQUIRED_POWER, DEFAULT_FUTILITY_TYPE,
  DEFAULT_MIN_ANALYSIS_INTERVAL, DEFAULT_FIRST_ANALYSIS_INTERVAL,
  DEFAULT_MAX_DURATION_INTERVAL, DEFAULT_BASELINE_PARTICIPANTS, DEFAULT_AUDIENCE,
  DEFAULT_CONTROL_NAME, DEFAULT_TREATMENT_NAME,
} from './defaults.js';

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

interface CustomFieldResult {
  values: Record<string, { type: string; value: string }> | undefined;
  warnings: string[];
}

function buildCustomSectionFieldValues(
  context: ResolverContext,
  experimentType: string,
  ownerId: number | undefined,
  templateCustomFields?: Record<string, string>,
): CustomFieldResult {
  const warnings: string[] = [];

  if (!context.customSectionFields || context.customSectionFields.length === 0) {
    if (templateCustomFields && Object.keys(templateCustomFields).length > 0) {
      for (const name of Object.keys(templateCustomFields)) {
        warnings.push(`Custom field "${name}" in template has no matching custom section field`);
      }
    }
    return { values: undefined, warnings };
  }

  const relevantFields = context.customSectionFields.filter(
    (f) => !f.archived && f.custom_section?.type === experimentType && !f.custom_section?.archived,
  );

  if (templateCustomFields) {
    const relevantTitles = new Set(relevantFields.map(f => (f.title ?? f.name ?? '').toLowerCase()));
    for (const name of Object.keys(templateCustomFields)) {
      if (!relevantTitles.has(name.toLowerCase())) {
        warnings.push(`Custom field "${name}" in template has no matching custom section field`);
      }
    }
  }

  if (relevantFields.length === 0) {
    return { values: undefined, warnings };
  }

  const fieldValues: Record<string, { type: string; value: string }> = {};
  for (const field of relevantFields) {
    let value = field.default_value ?? '';
    if (field.type === 'user' && ownerId) {
      value = JSON.stringify({ selected: [{ userId: ownerId }] });
    }
    if (templateCustomFields) {
      const fieldLabel = field.title ?? field.name ?? '';
      const templateValue = templateCustomFields[fieldLabel];
      if (templateValue !== undefined) {
        if (field.type === 'user' && templateValue && !templateValue.startsWith('{')) {
          const userIds = templateValue.split(',').map(ref => {
            const trimmed = ref.trim();
            if (trimmed.startsWith('user:')) return parseInt(trimmed.slice(5), 10);
            const user = context.users?.find(u =>
              u.email.toLowerCase() === trimmed.toLowerCase()
            );
            return user?.id;
          }).filter((id): id is number => id !== undefined && !isNaN(id));
          value = JSON.stringify({ selected: userIds.map(userId => ({ userId })) });
        } else {
          value = templateValue;
        }
      }
    }
    fieldValues[field.id] = { type: field.type, value };
  }

  return { values: fieldValues, warnings };
}

async function buildVariantScreenshots(
  template: ExperimentTemplate,
  warnings: string[],
): Promise<Array<Record<string, unknown>>> {
  if (!template.variants) return [];

  const screenshots: Array<Record<string, unknown>> = [];
  for (const v of template.variants) {
    if (!v.screenshot) continue;

    if (v.screenshot.startsWith('/files/')) continue;

    let resolved;
    try {
      resolved = await resolveScreenshot(v.screenshot, v.name);
    } catch (error) {
      warnings.push(`Screenshot for variant "${v.name}" failed: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (!resolved) continue;

    screenshots.push({
      variant: v.variant ?? template.variants.indexOf(v),
      file_upload: resolved,
    });
  }

  return screenshots;
}

const KNOWN_TEMPLATE_KEYS = new Set([
  'name', 'display_name', 'type', 'state',
  'percentage_of_traffic', 'percentages',
  'unit_type', 'application',
  'primary_metric', 'secondary_metrics', 'guardrail_metrics', 'exploratory_metrics',
  'owner_id', 'owners', 'teams', 'tags', 'audience',
  'variants', 'custom_fields',
  'analysis_type', 'required_alpha', 'required_power', 'baseline_participants',
]);

export interface BuildPayloadResult {
  payload: Record<string, unknown>;
  warnings: string[];
}

export async function buildExperimentPayload(
  template: ExperimentTemplate,
  context: ResolverContext,
  defaultType = 'test',
): Promise<BuildPayloadResult> {
  const warnings: string[] = [];

  for (const key of Object.keys(template)) {
    if (!KNOWN_TEMPLATE_KEYS.has(key) && (template as Record<string, unknown>)[key] !== undefined) {
      warnings.push(`Unknown template field "${key}" will be ignored`);
    }
  }
  const experimentType = template.type ?? defaultType;
  const variants = buildVariants(template);

  const payload: Record<string, unknown> = {
    name: template.name,
    display_name: template.display_name ?? template.name,
    type: experimentType,
    state: template.state ?? DEFAULT_STATE,
    percentage_of_traffic: template.percentage_of_traffic ?? DEFAULT_TRAFFIC,
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
    variant_screenshots: await buildVariantScreenshots(template, warnings),
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

  const allMetrics: Array<{ metric_id: number; type: string; order_index: number }> = [];
  let orderIndex = 0;

  if (template.secondary_metrics && template.secondary_metrics.length > 0) {
    for (const name of template.secondary_metrics) {
      const metric = resolveByName(context.metrics, name, 'Secondary metric');
      allMetrics.push({ metric_id: metric.id, type: 'secondary', order_index: orderIndex++ });
    }
  }

  if (template.guardrail_metrics && template.guardrail_metrics.length > 0) {
    for (const name of template.guardrail_metrics) {
      const metric = resolveByName(context.metrics, name, 'Guardrail metric');
      allMetrics.push({ metric_id: metric.id, type: 'guardrail', order_index: orderIndex++ });
    }
  }

  if (template.exploratory_metrics && template.exploratory_metrics.length > 0) {
    for (const name of template.exploratory_metrics) {
      const metric = resolveByName(context.metrics, name, 'Exploratory metric');
      allMetrics.push({ metric_id: metric.id, type: 'exploratory', order_index: orderIndex++ });
    }
  }

  if (allMetrics.length > 0) {
    payload.secondary_metrics = allMetrics;
  }

  let ownerId: number | undefined;
  if (template.owners && template.owners.length > 0 && context.users) {
    const resolvedOwners: Array<{ user_id: number }> = [];
    for (const ownerRef of template.owners) {
      const asInt = parseInt(String(ownerRef), 10);
      if (!isNaN(asInt) && String(asInt) === String(ownerRef).trim()) {
        resolvedOwners.push({ user_id: asInt });
      } else {
        const raw = String(ownerRef).trim();
        const emailInBrackets = /<(.+?)>/.exec(raw);
        const ref = (emailInBrackets ? emailInBrackets[1]! : raw).toLowerCase();
        const matches = context.users.filter(u =>
          u.email.toLowerCase() === ref ||
          `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim().toLowerCase() === ref
        );
        if (matches.length === 1) {
          resolvedOwners.push({ user_id: matches[0]!.id });
        } else if (matches.length > 1) {
          const suggestions = matches.map(u => `${u.email} (id: ${u.id})`).join(', ');
          warnings.push(`Owner "${ownerRef}" matches multiple users: ${suggestions}. Use email to disambiguate.`);
        } else {
          warnings.push(`Owner "${ownerRef}" not found, skipping`);
        }
      }
    }
    if (resolvedOwners.length > 0) {
      payload.owners = resolvedOwners;
      ownerId = resolvedOwners[0]!.user_id;
    }
  } else if (template.owner_id) {
    ownerId = Number(template.owner_id);
    payload.owners = [{ user_id: ownerId }];
  }

  if (template.teams && template.teams.length > 0 && context.teams) {
    const resolvedTeams: Array<{ team_id: number }> = [];
    for (const teamName of template.teams) {
      const team = context.teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
      if (team) {
        resolvedTeams.push({ team_id: team.id });
      } else {
        warnings.push(`Team "${teamName}" not found, skipping`);
      }
    }
    if (resolvedTeams.length > 0) payload.teams = resolvedTeams;
  }

  if (template.tags && template.tags.length > 0 && context.experimentTags) {
    const resolvedTags: Array<{ experiment_tag_id: number }> = [];
    for (const tagName of template.tags) {
      const tag = context.experimentTags.find(t => t.tag.toLowerCase() === tagName.toLowerCase());
      if (tag) {
        resolvedTags.push({ experiment_tag_id: tag.id });
      } else {
        warnings.push(`Tag "${tagName}" not found, skipping`);
      }
    }
    if (resolvedTags.length > 0) payload.experiment_tags = resolvedTags;
  }

  if (template.audience) {
    try {
      payload.audience = JSON.stringify(JSON.parse(template.audience));
    } catch {
      payload.audience = template.audience;
    }
  }

  const customFieldResult = buildCustomSectionFieldValues(context, experimentType, ownerId, template.custom_fields);
  if (customFieldResult.values) {
    payload.custom_section_field_values = customFieldResult.values;
  }
  warnings.push(...customFieldResult.warnings);

  return { payload, warnings };
}
