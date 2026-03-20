import type { Experiment } from './types.js';

export type ExperimentInput = Record<string, unknown> & {
  name: string;
  unit_type?: { unit_type_id: number };
  owners: { user_id: number }[];
  teams: { team_id: number }[];
  experiment_tags: { experiment_tag_id: number }[];
  applications: { application_id: number; application_version?: string }[];
  primary_metric: { metric_id: number };
  secondary_metrics: { metric_id: number; type: string; order_index: number }[];
  variants: { variant: number; name: string; config?: string }[];
  variant_screenshots: { variant: number; screenshot_file_upload_id: number; label?: string }[];
  custom_section_field_values: Record<string, CustomFieldValueInput>;
};

interface CustomFieldValueInput {
  experiment_id?: number;
  experiment_custom_section_field_id?: number;
  type: string;
  value: string;
}

const STRIPPED_FIELDS = new Set([
  'id',
  'environment_id',
  'created_by',
  'created_by_user_id',
  'updated_by',
  'updated_by_user_id',
  'created_at',
  'updated_at',
  'version',
  'note',
  'seed',
  'traffic_seed',
  'archived',
  'start_at',
  'stop_at',
  'full_on_at',
  'full_on_variant',
  'feature_on_at',
  'feature_off_at',
  'feature_state',
  'development_at',
  'last_seen_in_code_at',
  'primary_metric_id',
  'unit_type_id',
  'has_experiment_report',
  'experiment_report',
  'experiment_task_states',
  'experiment_update_schedule_id',
  'group_sequential_analyses',
  'iterations',
  'alerts',
  'recommended_action',
  'sample_size',
  'split',
  'preview_variants',
  'scheduled_actions',
  'favorites',
]);

const TRANSFORMED_FIELDS = new Set([
  'unit_type',
  'owners',
  'teams',
  'experiment_tags',
  'applications',
  'primary_metric',
  'secondary_metrics',
  'variants',
  'variant_screenshots',
  'custom_section_field_values',
]);

function extractId(obj: Record<string, unknown>, specificKey: string): number {
  return (obj[specificKey] ?? obj.id) as number;
}

export function experimentToInput(experiment: Experiment): ExperimentInput {
  const exp = experiment as Record<string, unknown>;
  const input: Record<string, unknown> = {};

  for (const key of Object.keys(exp)) {
    if (STRIPPED_FIELDS.has(key) || TRANSFORMED_FIELDS.has(key)) continue;
    if (exp[key] !== undefined) {
      input[key] = exp[key];
    }
  }

  input.unit_type = experiment.unit_type
    ? { unit_type_id: extractId(experiment.unit_type as Record<string, unknown>, 'unit_type_id') }
    : undefined;

  input.owners = Array.isArray(experiment.owners)
    ? experiment.owners.map((o: Record<string, unknown>) => ({ user_id: o.user_id as number }))
    : [];

  input.teams = Array.isArray(experiment.teams)
    ? experiment.teams.map((t: Record<string, unknown>) => ({ team_id: t.team_id as number }))
    : [];

  input.experiment_tags = Array.isArray(experiment.experiment_tags)
    ? experiment.experiment_tags.map((t: Record<string, unknown>) => ({ experiment_tag_id: t.experiment_tag_id as number }))
    : [];

  input.applications = Array.isArray(experiment.applications)
    ? experiment.applications.map((a: Record<string, unknown>) => ({
        application_id: a.application_id as number,
        application_version: a.application_version as string | undefined,
      }))
    : [];

  input.primary_metric = experiment.primary_metric
    ? { metric_id: extractId(experiment.primary_metric as Record<string, unknown>, 'metric_id') }
    : { metric_id: 0 };

  input.secondary_metrics = Array.isArray(experiment.secondary_metrics)
    ? experiment.secondary_metrics.map((m: Record<string, unknown>) => ({
        metric_id: (m.metric_id ?? m.id) as number,
        type: m.type as string,
        order_index: m.order_index as number,
      }))
    : [];

  input.variants = Array.isArray(experiment.variants)
    ? experiment.variants.map((v: Record<string, unknown>) => ({
        variant: v.variant as number,
        name: v.name as string,
        config: v.config as string | undefined,
      }))
    : [];

  input.variant_screenshots = Array.isArray(experiment.variant_screenshots)
    ? experiment.variant_screenshots.map((s: Record<string, unknown>) => ({
        variant: s.variant as number,
        screenshot_file_upload_id: s.screenshot_file_upload_id as number,
        label: s.label as string | undefined,
      }))
    : [];

  input.custom_section_field_values = transformCustomFieldValues(experiment.custom_section_field_values);

  return input as ExperimentInput;
}

function transformCustomFieldValues(
  values: unknown
): Record<string, CustomFieldValueInput> {
  if (!values) return {};

  if (!Array.isArray(values)) {
    return values as Record<string, CustomFieldValueInput>;
  }

  const result: Record<string, CustomFieldValueInput> = {};
  for (const v of values) {
    const entry = v as Record<string, unknown>;
    const key = String(
      entry.experiment_custom_section_field_id ?? entry.field_id ?? entry.id
    );
    const input: CustomFieldValueInput = {
      type: entry.type as string,
      value: entry.value as string,
    };
    if (entry.experiment_id !== undefined) {
      input.experiment_id = entry.experiment_id as number;
    }
    if (entry.experiment_custom_section_field_id ?? entry.field_id) {
      input.experiment_custom_section_field_id = (entry.experiment_custom_section_field_id ?? entry.field_id) as number;
    }
    result[key] = input;
  }
  return result;
}
